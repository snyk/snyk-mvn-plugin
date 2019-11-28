import * as path from 'path';
import * as test from 'tap-only';
import * as plugin from '../../lib';
import { readFixtureJSON } from '../file-helper';
import { legacyPlugin } from '@snyk/cli-interface';

const testsPath = path.join(__dirname, '..');
const fixturesPath = path.join(testsPath, 'fixtures');
const jarsPath = path.join(fixturesPath, 'jars');
const badPath = path.join(fixturesPath, 'bad');
const goodAndBadPath = path.join(fixturesPath, 'good-and-bad');
const springCorePath = path.join(fixturesPath, 'spring-core');
const springCoreJar = 'spring-core-5.1.8.RELEASE.jar';

test('inspect with spring-core jar file', async (t) => {
  const result = await plugin.inspect(springCorePath, springCoreJar);
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('spring-core', 'expected.json');
  t.same(result, expected, 'should return expected result');
});

test('inspect on altered jar', async (t) => {
  try {
    await plugin.inspect(badPath, 'jackson-databind-2.9.9.jar');
    t.fail('expected inspect to throw error');
  } catch (error) {
    const expectedPath = path.join(badPath, 'jackson-databind-2.9.9.jar');
    t.equal(
      error.message,
      `There was a problem generating a pom file for jar ${expectedPath}. ` +
        "No package found querying 'https://search.maven.org/solrsearch/select' for sha1 hash " +
        "'41c79125d6e7daf6aa577e26f95e81adb87af97c'.",
      'should throw expected error',
    );
  }
});

test('inspect on non-existent jar', async (t) => {
  try {
    await plugin.inspect(__dirname, 'nowhere-to-be-found-1.0.jar');
    t.fail('expected inspect to throw error');
  } catch (error) {
    const expectedPath = path.join(__dirname, 'nowhere-to-be-found-1.0.jar');
    t.equal(
      error.message,
      'Could not find file or directory ' + expectedPath,
      'should throw expected error',
    );
  }
});

test('inspect on user created jar (same as altered)', async (t) => {
  try {
    await plugin.inspect(badPath, 'mvn-app-1.0-SNAPSHOT.jar');
    t.fail('expected inspect to throw error');
  } catch (error) {
    const expectedPath = path.join(badPath, 'mvn-app-1.0-SNAPSHOT.jar');
    t.equal(
      error.message,
      `There was a problem generating a pom file for jar ${expectedPath}. ` +
        "No package found querying 'https://search.maven.org/solrsearch/select' for sha1 hash " +
        "'c5148d1623cb6097eba45b5fa05b3358a1022f80'.",
      'should throw expected error',
    );
  }
});

test('inspect in directory with jars no target file and --scan-all-unmanaged arg', async (t) => {
  const result = await plugin.inspect(jarsPath, undefined, {
    scanAllUnmanaged: true,
  });
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('jars', 'expected.json');
  t.same(result, expected, 'should return expected result');
});

test('inspect on target pom file in directory with jars and --scan-all-unmanaged arg', async (t) => {
  const result = await plugin.inspect(jarsPath, 'pom.xml', {
    scanAllUnmanaged: true,
  });
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('jars', 'expected.json');
  t.same(
    result,
    expected,
    'should return expected result (using jars not pom)',
  );
});

test('inspect in directory with no jars no target file and --scan-all-unmanaged arg', async (t) => {
  try {
    await plugin.inspect(__dirname, undefined, { scanAllUnmanaged: true });
    t.fail('expected inspect to throw error');
  } catch (error) {
    t.equal(
      error.message,
      `Could not find any supported files in '${__dirname}'.`,
      'should throw error with message could not find jar files',
    );
  }
});

test('inspect in directory with good and bad jars and --scan-all-unmanaged arg', async (t) => {
  const result = await plugin.inspect(goodAndBadPath, undefined, {
    scanAllUnmanaged: true,
  });
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('good-and-bad', 'expected.json');
  t.same(result, expected, 'should return good dependency, with bad ignored');
});
