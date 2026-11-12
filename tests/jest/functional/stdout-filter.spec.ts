import * as fs from 'fs';
import * as path from 'path';
import { DependencyTreeStdoutFilter } from '../../../lib/parse/stdout-filter';
import {
  parseDigraphsFromStdout,
  parsePluginVersionFromStdout,
} from '../../../lib/parse/stdout';

function feed(
  filter: DependencyTreeStdoutFilter,
  input: string,
  chunkSize?: number,
): DependencyTreeStdoutFilter {
  const buf = Buffer.from(input, 'utf8');
  const size = chunkSize || buf.length || 1;
  for (let i = 0; i < buf.length; i += size) {
    filter.write(buf.subarray(i, i + size));
  }
  filter.end();
  return filter;
}

// Filters from the first byte (threshold 0), unless a threshold is given.
function filterAll(
  input: string,
  chunkSize?: number,
  thresholdChars = 0,
): string {
  return feed(
    new DependencyTreeStdoutFilter({ thresholdChars }),
    input,
    chunkSize,
  ).output();
}

function outcome(fn: () => unknown): unknown {
  try {
    return { value: fn() };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

// The parsers must behave identically on filtered and unfiltered output.
function expectEquivalent(raw: string, filtered: string) {
  expect(outcome(() => parseDigraphsFromStdout(filtered))).toEqual(
    outcome(() => parseDigraphsFromStdout(raw)),
  );
  expect(outcome(() => parsePluginVersionFromStdout(filtered))).toEqual(
    outcome(() => parsePluginVersionFromStdout(raw)),
  );
  const metaversions = (s: string) =>
    s.includes(':RELEASE:') || s.includes(':LATEST:');
  expect(metaversions(filtered)).toEqual(metaversions(raw));
}

const debugNoise = Array.from(
  { length: 50 },
  (_, i) =>
    `[DEBUG]   (f) compilerArguments = [-Xlint:all] ${i} résumé ✓ {not a block}`,
).join('\n');

const reactorStdout = `[INFO] Scanning for projects...
${debugNoise}
[INFO] --- maven-dependency-plugin:3.7.0:tree (default-cli) @ module-a ---
[INFO] digraph "io.snyk:module-a:jar:1.0" {
[INFO] 	"io.snyk:module-a:jar:1.0" -> "org.example:lib:jar:2.0:compile" ;
[4.326s][info][gc] GC(9) Pause Young (Normal) 24M->8M(64M) 3.1ms }
[INFO] [4.400s][info][gc] GC(10) Pause Young (Normal) 24M->8M(64M) 3.1ms }
[INFO] 	"org.example:lib:jar:2.0:compile" -> "org.example:meta:jar:RELEASE:compile" ;
[INFO]  }
${debugNoise}
[WARNING] something about a module }
[INFO] digraph "io.snyk:module-b:jar:1.0" {
[INFO] 	"io.snyk:module-b:jar:1.0" -> "org.example:lib:jar:2.0:compile" ;
[INFO]  }
${debugNoise}
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
`;

describe('DependencyTreeStdoutFilter', () => {
  test('parsers see the same results on filtered output', () => {
    const filtered = filterAll(reactorStdout);
    expectEquivalent(reactorStdout, filtered);
    expect(parseDigraphsFromStdout(filtered)).toHaveLength(2);
  });

  test('drops output the parsers never read', () => {
    const filtered = filterAll(reactorStdout);
    expect(filtered).not.toContain('compilerArguments');
    expect(filtered).not.toContain('Scanning for projects');
    expect(filtered.length).toBeLessThan(reactorStdout.length / 5);
  });

  test('is independent of how stdout is chunked, including mid-character', () => {
    const whole = filterAll(reactorStdout);
    for (const size of [1, 2, 3, 7, 64, 1000]) {
      expect(filterAll(reactorStdout, size)).toEqual(whole);
    }
  });

  test('keeps the build failure signal', () => {
    const failing = `[INFO] digraph "a:b:jar:1" {
[INFO]  }
${debugNoise}
[ERROR] Failed to execute goal on project b
[INFO] BUILD FAILURE
`;
    const filtered = filterAll(failing);
    expectEquivalent(failing, filtered);
    expect(() => parseDigraphsFromStdout(filtered)).toThrow(
      'Maven output contains errors.',
    );
  });

  test('keeps errors logged in a successful build', () => {
    const passing = `[ERROR] a non-fatal error
[INFO] digraph "a:b:jar:1" {
[INFO]  }
[INFO] BUILD SUCCESS
`;
    expectEquivalent(passing, filterAll(passing));
  });

  test('handles output with no trailing newline', () => {
    const noNewline = `[INFO] digraph "a:b:jar:1" { \n[INFO]  } \n[INFO] BUILD SUCCESS`;
    expectEquivalent(noNewline, filterAll(noNewline));
  });

  test('handles a block that opens and closes on one line', () => {
    const oneLine = `digraph "a:b:jar:1" { } \n${debugNoise}\ndigraph "c:d:jar:1" { \n } \n`;
    const filtered = filterAll(oneLine);
    expectEquivalent(oneLine, filtered);
    expect(filtered).not.toContain('compilerArguments');
  });

  test('matches the existing parse-digraph fixtures', () => {
    const dir = path.join(__dirname, '../../fixtures/parse-digraph');
    for (const file of fs.readdirSync(dir)) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      expectEquivalent(raw, filterAll(raw));
    }
  });

  test('keeps only a bounded tail of raw output, starting at a line', () => {
    const filter = new DependencyTreeStdoutFilter({
      thresholdChars: 0,
      tailChars: 100,
    });
    for (let i = 0; i < 1000; i++) {
      filter.write(Buffer.from(`[DEBUG] line ${i}\n`));
    }
    filter.end();
    const tail = filter.rawTail();
    expect(tail.length).toBeLessThanOrEqual(100);
    expect(tail.length).toBeGreaterThan(80);
    expect(tail.startsWith('[DEBUG] line ')).toBe(true);
    expect(tail.endsWith('[DEBUG] line 999\n')).toBe(true);
    expect(filter.result()).toEqual('');
  });

  test('reports the whole output on failure when it fits in the tail', () => {
    const small = `[INFO] Scanning\n[ERROR] boom\n[INFO] BUILD FAILURE\n`;
    const filter = new DependencyTreeStdoutFilter({
      thresholdChars: 0,
      tailChars: 1000,
    });
    filter.write(small);
    filter.end();
    expect(filter.failureOutput()).toEqual(small);
  });

  test('keeps early errors in the failure output of a long build', () => {
    const filter = new DependencyTreeStdoutFilter({
      thresholdChars: 0,
      tailChars: 200,
    });
    filter.write(
      '[ERROR] [ERROR] Some problems were encountered while processing the POMs:\n' +
        '[FATAL] Non-parseable POM /repo/m1/pom.xml: end tag name mismatch\n',
    );
    for (let i = 0; i < 1000; i++) {
      filter.write(`[DEBUG] line ${i}\n`);
    }
    filter.write('[INFO] BUILD FAILURE\n');
    filter.end();
    const output = filter.failureOutput();
    expect(output).toContain('Some problems were encountered');
    expect(output).toContain('[INFO] BUILD FAILURE');
    expect(output).not.toContain('[DEBUG] line 0\n');
  });

  test('falls back to a tail the parsers treat like the full output', () => {
    // Mirrors sub-process.ts: result() || rawTail(). The tail starts at a line
    // boundary, so a cut can't create a line that starts with "[ERROR]".
    const raw = Array.from(
      { length: 200 },
      (_, i) => `[DEBUG] x${i} [ERROR] not at line start }`,
    ).join('\n');
    const filter = new DependencyTreeStdoutFilter({
      thresholdChars: 0,
      tailChars: 150,
    });
    filter.write(raw);
    filter.end();
    expect(filter.result()).toEqual('');
    expectEquivalent(raw, filter.result() || filter.rawTail());
    expect(() => parseDigraphsFromStdout(filter.rawTail())).toThrow(
      'Cannot find any digraphs.',
    );
  });

  test('keeps the full output unchanged below the threshold', () => {
    const filter = feed(new DependencyTreeStdoutFilter(), reactorStdout);
    expect(filter.isFiltering()).toBe(false);
    expect(filter.output()).toEqual(reactorStdout);
    expect(filter.failureOutput()).toEqual(reactorStdout);
  });

  test('matches the old accumulation exactly below the threshold', () => {
    // Old path in sub-process.ts: stdout = stdout + data, per Buffer chunk.
    // That decodes each chunk on its own, so a multi-byte character split
    // across chunks is garbled; below the threshold we keep that as it was.
    const buf = Buffer.from(reactorStdout, 'utf8');
    for (const size of [1, 2, 7]) {
      const filter = new DependencyTreeStdoutFilter();
      let old = '';
      for (let i = 0; i < buf.length; i += size) {
        const chunk = buf.subarray(i, i + size);
        filter.write(chunk);
        old = old + chunk;
      }
      filter.end();
      expect(filter.output()).toEqual(old);
    }
  });

  test('switches to filtering mid-stream once past the threshold', () => {
    const threshold = Math.floor(reactorStdout.length / 2);
    for (const size of [1, 7, 64, 1000]) {
      const filter = feed(
        new DependencyTreeStdoutFilter({ thresholdChars: threshold }),
        reactorStdout,
        size,
      );
      expect(filter.isFiltering()).toBe(true);
      expect(filter.output()).toEqual(filterAll(reactorStdout));
    }
  });

  // Differential test: random Maven-like output built from the line shapes the
  // parsers care about, including the awkward ones (noise ending in "}", JVM
  // log lines inside blocks, "digraph" mentioned outside a block, CRLF).
  test('matches the parsers on randomised output', () => {
    let seed = 42;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const pick = <T>(xs: T[]) => xs[rand(xs.length)];
    const outside = [
      '[INFO] Building module',
      '[DEBUG] config = {a=b}',
      '[DEBUG] mentions digraph in passing',
      '[WARNING] odd line }',
      '[ERROR] something failed',
      '[INFO] BUILD SUCCESS',
      '[INFO] --- maven-dependency-plugin:3.7.0:tree (default-cli) @ m ---',
      '[INFO] --- dependency:2.8:tree (default-cli) @ m ---',
      '[DEBUG] résumé ✓ 日本',
      '[3.1s][info][gc] GC(1) Pause }',
      '',
    ];
    const inside = [
      '[INFO] \t"a:b:jar:1" -> "c:d:jar:2:compile" ;',
      '[INFO] \t"a:b:jar:1" -> "c:meta:jar:RELEASE:compile" ;',
      '[INFO] \t"a:b:jar:1" -> "c:meta:jar:LATEST:test" ;',
      '[4.326s][info][gc] GC(9) Pause Young (Normal) 24M->8M(64M) 3.1ms }',
      '[INFO] [4.4s][info][gc] GC(10) Pause }',
      '[DEBUG] noise inside a block',
      '\t"x:y:jar:1" -> "z:w:jar:1:compile" ;',
    ];
    for (let run = 0; run < 300; run++) {
      const eol = rand(4) === 0 ? '\r\n' : '\n';
      const lines: string[] = [];
      const count = 5 + rand(60);
      for (let i = 0; i < count; i++) {
        if (rand(5) === 0) {
          const name = `"g:m${i}:jar:1"`;
          if (rand(6) === 0) {
            lines.push(`[INFO] digraph ${name} { }`);
            continue;
          }
          lines.push(`[INFO] digraph ${name} {`);
          for (let j = rand(6); j > 0; j--) {
            lines.push(pick(inside));
          }
          if (rand(8) !== 0) {
            lines.push(pick(['[INFO]  }', '[INFO] } ', '}']));
          }
        } else {
          lines.push(pick(outside));
        }
      }
      const raw = lines.join(eol) + (rand(3) === 0 ? '' : eol);
      for (const size of [1, 5, 4096]) {
        expectEquivalent(raw, filterAll(raw, size));
        // Before switching, chunks are concatenated as on the old path, which
        // garbles multi-byte characters split across chunks (see above). Use
        // ASCII to test the switch itself.
        const ascii = raw.replace(/[^\x00-\x7f]/g, '?');
        for (const threshold of [37, 400]) {
          expectEquivalent(ascii, filterAll(ascii, size, threshold));
        }
      }
    }
  });
});
