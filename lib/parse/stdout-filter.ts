import { StringDecoder } from 'node:string_decoder';

// Stdout collector for `mvn dependency:tree -DoutputType=dot`.
//
// By default it keeps the whole output, exactly as before. An aggregate
// (reactor) scan of a very large build, especially with `-X`, can produce
// more output than V8's maximum string length (~512M chars on Node >= 14), and
// accumulating it into one string throws `RangeError: Invalid string length`
// regardless of heap size. So once the output passes `thresholdChars`, the
// collector drops the full copy and from then on keeps only the lines the
// parsers read (see lib/parse/stdout.ts and detectMetaversions in
// lib/maven/executor.ts):
//   - digraph blocks: from a line containing "digraph" up to the first line
//     whose last non-whitespace character is "}" (mirrors lib/parse-digraph.ts)
//   - "[ERROR]" lines and the "[INFO] BUILD SUCCESS" line (build status check)
//   - the maven-dependency-plugin "...:tree" line (plugin version)
//   - lines containing ":RELEASE:" or ":LATEST:" (metaversion detection)
// Builds below the threshold are unaffected.

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

export interface DependencyTreeStdoutFilterOptions {
  thresholdChars?: number;
  tailChars?: number;
}

export class DependencyTreeStdoutFilter {
  private readonly thresholdChars: number;
  private readonly tailChars: number;
  private readonly decoder = new StringDecoder('utf8');
  // The full output, until it passes the threshold; null once filtering.
  private raw: string | null = '';
  private readonly kept: string[] = [];
  private partial = '';
  private inDigraph = false;
  private tail = '';
  private readonly errorLines: string[] = [];
  private errorChars = 0;
  private totalChars = 0;

  constructor(options: DependencyTreeStdoutFilterOptions = {}) {
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
    const errors = this.errorLines.join('');
    if (!errors || this.totalChars <= this.tailChars) {
      return tail;
    }
    return `${errors}[... output truncated ...]\n${tail}`;
  }

  /** The retained lines, in their original order. Empty until filtering. */
  result(): string {
    return this.kept.join('');
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
      this.tail = text.slice(text.length - this.tailChars);
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

    if (failureLine.test(content) && this.errorChars < MAX_ERROR_CHARS) {
      this.errorLines.push(line.endsWith('\n') ? line : `${line}\n`);
      this.errorChars += line.length;
    }

    if (this.inDigraph) {
      this.kept.push(line);
      if (this.isDigraphEnd(content)) {
        this.inDigraph = false;
      }
      return;
    }

    if (digraphStart.test(content)) {
      this.kept.push(line);
      // A block can open and close on the same line.
      const afterStart = content.slice(content.search(digraphStart));
      if (!digraphEnd.test(afterStart)) {
        this.inDigraph = true;
      }
      return;
    }

    if (
      errorLine.test(content) ||
      successLine.test(content) ||
      pluginVersionLine.test(content) ||
      metaversionLine.test(content)
    ) {
      this.kept.push(line);
    }
  }

  private isDigraphEnd(content: string): boolean {
    if (jvmUnifiedLogLine.test(content) || mavenLabelledJvmLine.test(content)) {
      return false;
    }
    return digraphEnd.test(content);
  }
}
