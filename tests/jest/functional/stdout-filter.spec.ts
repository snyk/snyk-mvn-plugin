import * as fs from 'fs';
import * as path from 'path';
import { DependencyTreeStdoutFilter } from '../../../lib/parse/stdout-filter';
import {
  parseDigraphsFromStdout,
  parsePluginVersionFromStdout,
} from '../../../lib/parse/stdout';

function filterAll(input: string, chunkSize?: number): string {
  const filter = new DependencyTreeStdoutFilter();
  const buf = Buffer.from(input, 'utf8');
  const size = chunkSize || buf.length || 1;
  for (let i = 0; i < buf.length; i += size) {
    filter.write(buf.subarray(i, i + size));
  }
  filter.end();
  return filter.result();
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

  test('keeps only a bounded tail of raw output for error messages', () => {
    const filter = new DependencyTreeStdoutFilter(100);
    for (let i = 0; i < 1000; i++) {
      filter.write(Buffer.from(`[DEBUG] line ${i}\n`));
    }
    filter.end();
    expect(filter.rawTail()).toHaveLength(100);
    expect(filter.rawTail().endsWith('[DEBUG] line 999\n')).toBe(true);
    expect(filter.result()).toEqual('');
  });
});
