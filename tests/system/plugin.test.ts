import * as path from 'path';
import * as test from 'tap-only';
import * as plugin from '../../lib';
import { readFixtureJSON } from '../file-helper';
import { legacyPlugin } from '@snyk/cli-interface';

test('inspect on test-project pom', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(__dirname, '../fixtures/test-project/pom.xml'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('test-project/expected.json');
  t.same(result, expected, 'should return expected result');
});

test('inspect on test-project pom with --dev', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(__dirname, '../fixtures/test-project/pom.xml'),
    {
      dev: true,
    },
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('test-project/expected-with-dev.json');
  t.same(result, expected, 'should return expected result');
});

test('inspect on path with spaces pom', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(__dirname, '..', 'fixtures/path with spaces', 'pom.xml'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('path with spaces/expected.json');
  t.same(result, expected, 'should return expected result');
});

test('inspect on pom with plugin', async (t) => {
  try {
    await plugin.inspect(
      '.',
      path.join(__dirname, '../fixtures/bad/pom.plugin.xml'),
      { dev: true },
    );
    t.fail('expected inspect to throw error');
  } catch (error) {
    t.match(
      error.message,
      'Cannot find dependency information.',
      'should throw expected error',
    );
  }
});

test('inspect on pom with bad dependency', async (t) => {
  try {
    await plugin.inspect('.', path.join(__dirname, '../fixtures/bad/pom.xml'), {
      dev: true,
    });
    t.fail('expected inspect to throw error');
  } catch (error) {
    t.match(
      error.message,
      'BUILD FAILURE',
      'should throw expected error with build failure message',
    );
    t.match(
      error.message,
      'no.such.groupId:no.such.artifactId:jar:1.0.0',
      'should throw expected error and mention the bad dependency',
    );
  }
});
