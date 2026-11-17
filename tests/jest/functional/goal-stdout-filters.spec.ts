import * as subProcess from '../../../lib/sub-process';
import {
  DependencyResolveStdoutFilter,
  parseResolveResult,
} from '../../../lib/parse/resolve-parser';
import {
  fetchRepositoryUrlMap,
  ListRepositoriesStdoutFilter,
} from '../../../lib/parse/m2-remote-repositories';
import { executeMavenDependencyResolve } from '../../../lib/maven/dependency-resolve';
import { MavenStdoutFilter } from '../../../lib/parse/stdout-filter';
import type { MavenContext } from '../../../lib/maven/context';

function feed<T extends MavenStdoutFilter>(
  filter: T,
  input: string,
  chunkSize: number,
): T {
  const buf = Buffer.from(input, 'utf8');
  for (let i = 0; i < buf.length; i += chunkSize) {
    filter.write(buf.subarray(i, i + chunkSize));
  }
  filter.end();
  return filter;
}

// The unfiltered path in sub-process.ts: stdout = stdout + data, per chunk.
function oldAccumulation(input: string, chunkSize: number): string {
  const buf = Buffer.from(input, 'utf8');
  let out = '';
  for (let i = 0; i < buf.length; i += chunkSize) {
    out = out + buf.subarray(i, i + chunkSize);
  }
  return out;
}

function randomOutput(lines: string[], count: number, seed: number): string {
  const rand = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const line = lines[rand(lines.length)];
    out.push(rand(10) === 0 ? `${line}\r` : line);
  }
  return out.join('\n') + (rand(2) ? '\n' : '');
}

const resolveLines = [
  '[INFO] Scanning for projects...',
  '[INFO] -----------------< io.snyk:module-a >-----------------',
  '[INFO] -----------------< io.snyk:module-b >-----------------',
  '[INFO] --- maven-dependency-plugin:3.6.1:resolve (default-cli) @ module-web ---',
  '[INFO] --- dependency:3.7.0:resolve (default-cli) @ module-a ---',
  '[INFO] --- maven-dependency-plugin:2.8:resolve (default-cli) @ webapp ---',
  '[INFO] The following files have been resolved:',
  '[INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging',
  '[INFO]    junit:junit:jar:4.13.2:test -- module junit [auto]',
  '[INFO]    org.example:meta:jar:2.0',
  '[INFO]    none',
  '  [INFO]    org.example:indented:jar:1.0:compile',
  '[DEBUG]    org.example:debug:jar:1.0:compile',
  '[DEBUG] résumé ✓ 日本 (f) compilerArguments = [-Xlint:all]',
  '[ERROR] something failed',
  '[INFO] BUILD SUCCESS',
  '',
];

const listRepositoriesLines = [
  '[INFO] Scanning for projects...',
  '[INFO] --- dependency:3.9.0:list-repositories (default-cli) @ m ---',
  '[INFO] Project remote repositories used by this build:',
  ' * central (https://repo.maven.apache.org/maven2, default, releases)',
  ' * snapshots (https://user:pass@nexus.invalid/snapshots/, default, releases+snapshots)',
  ' * central (https://repo.maven.apache.org/maven2, default, releases) mirrored by gcs (https://mirror.invalid/maven2/, default, releases)',
  '* not-indented (https://nope.invalid, default, releases)',
  '[DEBUG]  * debug-noise (https://debug.invalid, default, releases)',
  '[DEBUG] résumé ✓ 日本',
  '[INFO] BUILD SUCCESS',
  '',
];

describe('dependency:resolve stdout filter', () => {
  test('keeps the full output unchanged below the threshold', () => {
    const raw = randomOutput(resolveLines, 500, 1);
    const filter = feed(new DependencyResolveStdoutFilter(), raw, 64);
    expect(filter.isFiltering()).toBe(false);
    expect(filter.output()).toEqual(oldAccumulation(raw, 64));
  });

  test('parses identically when filtering, for any chunking', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const raw = randomOutput(resolveLines, 400, seed);
      const expected = parseResolveResult(raw);
      for (const [threshold, size] of [
        [0, 1],
        [0, 7],
        [0, 4096],
        [Math.floor(raw.length / 2), 13],
      ]) {
        const filter = feed(
          new DependencyResolveStdoutFilter({ thresholdChars: threshold }),
          raw,
          size,
        );
        expect(filter.isFiltering()).toBe(true);
        expect(filter.output()).not.toContain('[DEBUG]');
        expect(parseResolveResult(filter.output())).toEqual(expected);
      }
    }
  });
});

describe('dependency:list-repositories stdout filter', () => {
  test('keeps the full output unchanged below the threshold', () => {
    const raw = randomOutput(listRepositoriesLines, 500, 1);
    const filter = feed(new ListRepositoriesStdoutFilter(), raw, 64);
    expect(filter.isFiltering()).toBe(false);
    expect(filter.output()).toEqual(oldAccumulation(raw, 64));
  });

  test('parses identically when filtering, for any chunking', async () => {
    const context: MavenContext = {
      command: 'mvn',
      workingDirectory: '/project',
      root: '/project',
      targetFile: 'pom.xml',
      targetPath: '/project/pom.xml',
    };
    const spy = jest.spyOn(subProcess, 'execute');
    try {
      for (let seed = 1; seed <= 25; seed++) {
        const raw = randomOutput(listRepositoriesLines, 400, seed);
        spy.mockResolvedValueOnce(raw);
        const expected = await fetchRepositoryUrlMap(context, false);
        for (const size of [1, 7, 4096]) {
          const filter = feed(
            new ListRepositoriesStdoutFilter({ thresholdChars: 0 }),
            raw,
            size,
          );
          expect(filter.output()).not.toContain('[DEBUG]');
          spy.mockResolvedValueOnce(filter.output());
          expect(await fetchRepositoryUrlMap(context, false)).toEqual(expected);
        }
      }
    } finally {
      spy.mockRestore();
    }
  });
});

describe('stdout filter wiring', () => {
  const context: MavenContext = {
    command: 'mvn',
    workingDirectory: '/project',
    root: '/project',
    targetFile: 'pom.xml',
    targetPath: '/project/pom.xml',
  };
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(subProcess, 'execute').mockResolvedValue('');
  });
  afterEach(() => {
    spy.mockRestore();
  });

  test('dependency:resolve and list-repositories run with a filter', async () => {
    await executeMavenDependencyResolve(context, true, []);
    await fetchRepositoryUrlMap(context, true);
    expect(spy.mock.calls[0][2].stdoutFilter).toBeInstanceOf(
      DependencyResolveStdoutFilter,
    );
    expect(spy.mock.calls[1][2].stdoutFilter).toBeInstanceOf(
      ListRepositoriesStdoutFilter,
    );
  });
});
