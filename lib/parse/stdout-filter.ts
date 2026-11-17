import { StringDecoder } from 'node:string_decoder';

// Stdout collectors for the Maven subprocesses.
//
// By default they keep the whole output, exactly as before. A reactor scan of
// a very large build, especially with `-X`, can produce more output than V8's
// maximum string length (~512M chars on Node >= 14), and accumulating it into
// one string throws `RangeError: Invalid string length` regardless of heap
// size. The error is thrown inside the stdout "data" handler, so it crashes
// the process rather than rejecting the promise. Once the output passes
// `thresholdChars`, a collector drops the full copy and from then on keeps only
// the lines its parser reads. Builds below the threshold are unaffected.
//
// DependencyTreeStdoutFilter (`dependency:tree -DoutputType=dot`, see
// lib/parse/stdout.ts and detectMetaversions in lib/maven/executor.ts) keeps:
//   - digraph blocks: from a line containing "digraph" up to the first line
//     whose last non-whitespace character is "}" (mirrors lib/parse-digraph.ts)
//   - "[ERROR]" lines and the "[INFO] BUILD SUCCESS" line (build status check)
//   - the maven-dependency-plugin "...:tree" line (plugin version)
//   - lines containing ":RELEASE:" or ":LATEST:" (metaversion detection)
// The `dependency:resolve` and `dependency:list-repositories` filters live
// next to their parsers so they match exactly the same lines.

const digraphStart = /digraph/;
const digraphEnd = /\}\s*$/;
const errorLine = /^\[ERROR\]/;
// Lines worth keeping in a failure message ("[FATAL] Non-parseable POM ...").
const failureLine = /^\[(?:ERROR|FATAL)\]/;
const successLine = /^\[INFO\] BUILD SUCCESS/;
const pluginVersionLine = /(?:maven-dependency-plugin|dependency):\d+\.\d+/;
const metaversionLine = /:RELEASE:|:LATEST:/;
// JVM unified logging line (see lib/parse/stdout.ts). Such lines can be
// interleaved inside a digraph block; they are kept verbatim (the parser
// strips them) but must not be mistaken for the end of the block.
const jvmUnifiedLogLine =
  /^(?:\[[^\]\n]*\])*\[(?:trace|debug|info|warning|error)\s*\]\[[\w,+-]+\s*\]/;
const mavenLabelledJvmLine =
  /^\[\w+\]\s*(?:\[[^\]\n]*\])*\[(?:trace|debug|info|warning|error)\s*\]\[[\w,+-]+\s*\]/;

// Half of V8's maximum string length, leaving room for the copies the
// parsers make.
export const DEFAULT_FILTER_THRESHOLD_CHARS = 256 * 1024 * 1024;
export const DEFAULT_TAIL_CHARS = 1024 * 1024;
// Cap on the "[ERROR]" lines kept for failure messages, so a build that logs
// errors for every module can't grow the message without bound.
const MAX_ERROR_CHARS = 1024 * 1024;

// Lines are slices of the decoded chunk, and V8 sliced strings keep their
// parent alive, so a short kept line can pin a whole 64KB chunk (or the full
// buffered output at the switch-over). Kept lines are therefore copied into a
// flat string every LINES_PER_BLOCK lines, which releases the parents.
const LINES_PER_BLOCK = 256;

// Returns a flat copy of `parts` joined. Joining a single element returns it
// unchanged, so a one-character sentinel guarantees a real copy.
function flatJoin(parts: string[]): string {
  return [...parts, '\n'].join('').slice(0, -1);
}

class RetainedLines {
  private readonly blocks: string[] = [];
  private pending: string[] = [];
  chars = 0;

  push(line: string): void {
    this.pending.push(line);
    this.chars += line.length;
    if (this.pending.length >= LINES_PER_BLOCK) {
      this.flush();
    }
  }

  flush(): void {
    if (this.pending.length) {
      this.blocks.push(flatJoin(this.pending));
      this.pending = [];
    }
  }

  join(): string {
    return this.blocks.join('') + this.pending.join('');
  }
}

export interface StdoutFilterOptions {
  thresholdChars?: number;
  tailChars?: number;
}

export abstract class MavenStdoutFilter {
  private readonly thresholdChars: number;
  private readonly tailChars: number;
  private readonly decoder = new StringDecoder('utf8');
  // The full output, until it passes the threshold; null once filtering.
  private raw: string | null = '';
  private readonly kept = new RetainedLines();
  private partial = '';
  private tail = '';
  private readonly errorLines = new RetainedLines();
  private totalChars = 0;

  constructor(options: StdoutFilterOptions = {}) {
    this.thresholdChars =
      options.thresholdChars ?? DEFAULT_FILTER_THRESHOLD_CHARS;
    this.tailChars = options.tailChars ?? DEFAULT_TAIL_CHARS;
  }

  write(chunk: Buffer | string): void {
    if (this.raw !== null) {
      if (this.raw.length + chunk.length <= this.thresholdChars) {
        // Same accumulation as the unfiltered path in sub-process.ts.
        this.raw = this.raw + chunk;
        return;
      }
      // Switch to filtering: process what we have, then stream from here.
      const buffered = this.raw;
      this.raw = null;
      this.consume(buffered);
      // Release the buffered output, which kept lines may still reference.
      this.kept.flush();
      this.errorLines.flush();
      this.partial = flatJoin([this.partial]);
    }
    const text =
      typeof chunk === 'string' ? chunk : this.decoder.write(chunk as Buffer);
    this.consume(text);
  }

  end(): void {
    if (this.raw !== null) {
      return;
    }
    const rest = this.decoder.end();
    if (rest) {
      this.consume(rest);
    }
    if (this.partial) {
      this.processLine(this.partial);
      this.partial = '';
    }
  }

  /** True once the output passed the threshold and is being filtered. */
  isFiltering(): boolean {
    return this.raw === null;
  }

  /**
   * Stdout for a successful build: the full output below the threshold,
   * otherwise the retained lines. If nothing was retained, the raw tail: none
   * of its lines match what the parsers look for, so they fail exactly as they
   * would on the full output.
   */
  output(): string {
    if (this.raw !== null) {
      return this.raw;
    }
    return this.result() || this.rawTail();
  }

  /**
   * Stdout for a failed build: the full output below the threshold, otherwise
   * every "[ERROR]" and "[FATAL]" line (up to a cap) followed by the raw tail, so errors
   * logged early in a long build (for example "Non-parseable POM") still reach
   * the error message.
   */
  failureOutput(): string {
    if (this.raw !== null) {
      return this.raw;
    }
    const tail = this.rawTail();
    const errors = this.errorLines.join();
    if (!errors || this.totalChars <= this.tailChars) {
      return tail;
    }
    return `${errors}[... output truncated ...]\n${tail}`;
  }

  /** The retained lines, in their original order. Empty until filtering. */
  result(): string {
    return this.kept.join();
  }

  /**
   * The end of the raw output once filtering, at most `tailChars` characters,
   * starting at a line boundary so no partial line is reported.
   */
  rawTail(): string {
    if (this.raw !== null) {
      return this.raw;
    }
    if (this.totalChars <= this.tailChars) {
      return this.tail;
    }
    const nl = this.tail.indexOf('\n');
    return nl === -1 ? this.tail : this.tail.slice(nl + 1);
  }

  private consume(text: string): void {
    if (!text) {
      return;
    }
    this.totalChars += text.length;
    this.appendTail(text);

    let start = 0;
    let nl = text.indexOf('\n', start);
    if (nl === -1) {
      this.partial += text;
      return;
    }
    // First line completes any carried-over partial line.
    this.processLine(this.partial + text.slice(start, nl + 1));
    this.partial = '';
    start = nl + 1;
    while ((nl = text.indexOf('\n', start)) !== -1) {
      this.processLine(text.slice(start, nl + 1));
      start = nl + 1;
    }
    if (start < text.length) {
      this.partial = text.slice(start);
    }
  }

  private appendTail(text: string): void {
    if (this.tailChars <= 0) {
      return;
    }
    if (text.length >= this.tailChars) {
      this.tail = flatJoin([text.slice(text.length - this.tailChars)]);
      return;
    }
    const combined = this.tail + text;
    this.tail =
      combined.length > this.tailChars
        ? combined.slice(combined.length - this.tailChars)
        : combined;
  }

  // `line` includes its trailing "\n" (except possibly the final line).
  private processLine(line: string): void {
    const content = line.replace(/\r?\n$/, '');

    if (failureLine.test(content) && this.errorLines.chars < MAX_ERROR_CHARS) {
      this.errorLines.push(line.endsWith('\n') ? line : `${line}\n`);
    }

    if (this.keepLine(content)) {
      this.kept.push(line);
    }
  }

  /**
   * Whether the parser reads this line. `content` has no line terminator.
   * Called once per line, in order, only while filtering.
   */
  protected abstract keepLine(content: string): boolean;
}

/** Collector for `mvn dependency:tree -DoutputType=dot`. */
export class DependencyTreeStdoutFilter extends MavenStdoutFilter {
  private inDigraph = false;

  protected keepLine(content: string): boolean {
    if (this.inDigraph) {
      if (this.isDigraphEnd(content)) {
        this.inDigraph = false;
      }
      return true;
    }

    if (digraphStart.test(content)) {
      // A block can open and close on the same line.
      const afterStart = content.slice(content.search(digraphStart));
      if (!digraphEnd.test(afterStart)) {
        this.inDigraph = true;
      }
      return true;
    }

    return (
      errorLine.test(content) ||
      successLine.test(content) ||
      pluginVersionLine.test(content) ||
      metaversionLine.test(content)
    );
  }

  private isDigraphEnd(content: string): boolean {
    if (jvmUnifiedLogLine.test(content) || mavenLabelledJvmLine.test(content)) {
      return false;
    }
    return digraphEnd.test(content);
  }
}
