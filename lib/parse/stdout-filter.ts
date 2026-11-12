import { StringDecoder } from 'node:string_decoder';

// Streaming filter for `mvn dependency:tree -DoutputType=dot` stdout.
//
// An aggregate (reactor) scan runs `test-compile dependency:tree` across every
// module in one Maven invocation. On large reactors, and especially with `-X`,
// the full stdout exceeds V8's maximum string length (~512M chars on Node >= 14)
// and accumulating it into one string throws `RangeError: Invalid string length`
// regardless of heap size.
//
// Only a small part of that output is ever read (see lib/parse/stdout.ts and
// detectMetaversions in lib/maven/executor.ts):
//   - digraph blocks: from a line containing "digraph" up to the first line
//     whose last non-whitespace character is "}" (mirrors lib/parse-digraph.ts)
//   - "[ERROR]" lines and the "[INFO] BUILD SUCCESS" line (build status check)
//   - the maven-dependency-plugin "...:tree" line (plugin version)
//   - lines containing ":RELEASE:" or ":LATEST:" (metaversion detection)
// Everything else (compile logs, debug output) is dropped as it streams, so the
// retained text is what the parsers need and nothing more.

const digraphStart = /digraph/;
const digraphEnd = /\}\s*$/;
const errorLine = /^\[ERROR\]/;
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

export const DEFAULT_TAIL_BYTES = 1024 * 1024;

export class DependencyTreeStdoutFilter {
  private readonly decoder = new StringDecoder('utf8');
  private readonly kept: string[] = [];
  private partial = '';
  private inDigraph = false;
  private tail = '';
  private totalChars = 0;

  constructor(private readonly tailChars: number = DEFAULT_TAIL_BYTES) {}

  write(chunk: Buffer | string): void {
    const text =
      typeof chunk === 'string' ? chunk : this.decoder.write(chunk as Buffer);
    this.consume(text);
  }

  end(): void {
    const rest = this.decoder.end();
    if (rest) {
      this.consume(rest);
    }
    if (this.partial) {
      this.processLine(this.partial);
      this.partial = '';
    }
  }

  /** The retained lines, in their original order, newline-terminated. */
  result(): string {
    return this.kept.join('');
  }

  /** The last `tailChars` characters of the raw output, for error messages. */
  rawTail(): string {
    return this.tail;
  }

  /** Total characters seen, including dropped output. */
  seenChars(): number {
    return this.totalChars;
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
