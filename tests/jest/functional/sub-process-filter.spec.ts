import * as path from 'path';
import { execute } from '../../../lib/sub-process';
import { DependencyTreeStdoutFilter } from '../../../lib/parse/stdout-filter';
import { parseDigraphsFromStdout } from '../../../lib/parse/stdout';

const script = path.join(
  __dirname,
  '../../fixtures/stdout-filter/emit-maven-output.js',
);

// ~60 chars per filler line, so 50,000 lines is ~3MB: past the 1MB tail.
const LONG = '50000';
// Force filtering early so the tests don't need hundreds of MB of output.
const filtering = () =>
  new DependencyTreeStdoutFilter({ thresholdChars: 64 * 1024 });

describe('execute with a stdout filter', () => {
  test('below the threshold, stdout is identical to the unfiltered path', async () => {
    const unfiltered = await execute('node', [script, 'success', '2000']);
    const filter = new DependencyTreeStdoutFilter();
    const filtered = await execute('node', [script, 'success', '2000'], {
      stdoutFilter: filter,
    });
    expect(filter.isFiltering()).toBe(false);
    expect(filtered).toEqual(unfiltered);
  });

  test('below the threshold, a failure reports the full output as before', async () => {
    const unfiltered = await execute('node', [
      script,
      'pom-error',
      '2000',
    ]).catch((e) => e);
    const filtered = await execute('node', [script, 'pom-error', '2000'], {
      stdoutFilter: new DependencyTreeStdoutFilter(),
    }).catch((e) => e);
    expect(filtered.message).toEqual(unfiltered.message);
  });

  test('a failed long build still reports early POM errors', async () => {
    const filter = filtering();
    const err = await execute('node', [script, 'pom-error', LONG], {
      stdoutFilter: filter,
    }).catch((e) => e);
    expect(filter.isFiltering()).toBe(true);
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toContain('Non-parseable POM');
    expect(err.message).toContain('BUILD FAILURE');
    expect(err.message.length).toBeLessThan(1.1 * 1024 * 1024);
  });

  test('a successful long build returns only the lines the parsers read', async () => {
    const filter = filtering();
    const stdout = await execute('node', [script, 'success', LONG], {
      stdoutFilter: filter,
    });
    expect(filter.isFiltering()).toBe(true);
    expect(stdout).not.toContain('filler');
    expect(parseDigraphsFromStdout(stdout)).toHaveLength(1);
    expect(filter.rawTail()).toContain('BUILD SUCCESS');
  });

  test('long output with nothing to parse fails as it does unfiltered', async () => {
    const filtered = await execute('node', [script, 'noise-only', LONG], {
      stdoutFilter: filtering(),
    });
    const unfiltered = await execute('node', [script, 'noise-only', LONG]);
    expect(filtered).not.toContain('filler');
    expect(() => parseDigraphsFromStdout(filtered)).toThrow(
      'Cannot find any digraphs.',
    );
    expect(() => parseDigraphsFromStdout(unfiltered)).toThrow(
      'Cannot find any digraphs.',
    );
  });
});
