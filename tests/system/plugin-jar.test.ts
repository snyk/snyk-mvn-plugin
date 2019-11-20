import * as path from 'path';
import * as test from 'tap-only';
import * as plugin from '../../lib';
import { readFixtureJSON } from '../file-helper';
import { legacyPlugin } from '@snyk/cli-interface';

const jarsPath = path.join(__dirname, '..', 'fixtures', 'jars');
const badPath = path.join(__dirname, '..', 'fixtures', 'bad');

test('inspect on jar', async (t) => {
  const result = await plugin.inspect(
    jarsPath,
    'spring-core-5.1.8.RELEASE.jar',
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON(
    'jars/jars:spring-core-5.1.8.RELEASE.jar.json',
  );
  t.same(result, expected, 'should return expected result');
});

test('inspect on full path jar', async (t) => {
  const result = await plugin.inspect(
    path.join(__dirname, '..'),
    path.join('fixtures', 'jars', 'spring-core-5.1.8.RELEASE.jar'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON(
    'jars/fixtures.jars:spring-core-5.1.8.RELEASE.jar.json',
  );
  t.same(result, expected, 'should return expected result');
});

test('inspect on altered jar', async (t) => {
  try {
    await plugin.inspect(badPath, 'jackson-databind-2.9.9.jar');
    t.fail('expected inspect to throw error');
  } catch (error) {
    t.match(
      error.message,
      'No package found for provided sha1 hash',
      'should throw expected error',
    );
  }
});

test('inspect on non-existent jar', async (t) => {
  try {
    await plugin.inspect(jarsPath, 'nowhere-to-be-found-1.0.jar');
    t.fail('expected inspect to throw error');
  } catch (error) {
    t.match(
      error.message,
      'Unable to find jar at ',
      'should throw expected error',
    );
  }
});

test('inspect on user created jar (same as altered)', async (t) => {
  try {
    await plugin.inspect(badPath, 'mvn-app-1.0-SNAPSHOT.jar');
    t.fail('expected inspect to throw error');
  } catch (error) {
    t.match(
      error.message,
      'No package found for provided sha1 hash',
      'should throw expected error',
    );
  }
});
