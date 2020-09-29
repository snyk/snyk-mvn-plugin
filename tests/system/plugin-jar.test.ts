import * as path from 'path';
import * as test from 'tap-only';
import * as plugin from '../../lib';
import { readFixtureJSON } from '../file-helper';
import { legacyPlugin } from '@snyk/cli-interface';

const testsPath = path.join(__dirname, '..');
const fixturesPath = path.join(testsPath, 'fixtures');
const badPath = path.join(fixturesPath, 'bad');

test('inspect with spring-core jar file', async (t) =>
  assertFixture(
    {
      t,
      fixtureDirectory: 'spring-core',
      targetFile: 'spring-core-5.1.8.RELEASE.jar',
      assertMessage: 'should return expected result'
    },
  ));

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

test('inspect in directory with jars no target file and --scan-all-unmanaged arg', async (t) =>
  assertFixture(
    {
      t,
      fixtureDirectory: 'jars',
      options: { scanAllUnmanaged: true },
      assertMessage: 'should return expected result'
    },
  ));

test('inspect on target pom file in directory with jars and --scan-all-unmanaged arg', async (t) =>
  assertFixture(
    {
      t,
      fixtureDirectory: 'jars',
      targetFile: 'pom.xml',
      options: { scanAllUnmanaged: true },
      assertMessage: 'should return expected result (using jars not pom)'
    },
  ));

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

test('inspect in directory with good and bad jars and --scan-all-unmanaged arg', async (t) =>
  assertFixture(
    {
      t,
      fixtureDirectory: 'good-and-bad',
      options: { scanAllUnmanaged: true },
      assertMessage: 'should return good dependency, with bad ignored'
    },
  ));

test('inspect in directory with jar with wrong package name and --scan-all-unmanaged arg', async (t) =>
  assertFixture(
    {
      t,
      fixtureDirectory: 'jar-wrong-package-name',
      options: { scanAllUnmanaged: true },
      assertMessage: 'should return a dependency regardless of the amount of sha1 versions from maven.'
    },
  ));

test('inspect in directory with jars no target file and --scan-all-unmanaged and --all-projects args', async (t) =>
  assertFixture(
    {
      t,
      fixtureDirectory: 'nested-jars',
      options: { scanAllUnmanaged: true, allProjects: true },
      assertMessage: 'should return expected result'
    },
  ));

async function assertFixture(
  { t, fixtureDirectory, targetFile, options, assertMessage }:
    { t: any, fixtureDirectory: string, targetFile?: string, options?: any, assertMessage: string },
) {
  const root = path.join(fixturesPath, fixtureDirectory);
  const result = await plugin.inspect(root, targetFile, options);
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON(fixtureDirectory, 'expected.json');
  // result.metadata depends on platform, so no fixture can be provided
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.javaVersion,
    'should contain javaVersion key',
  );
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.mavenVersion,
    'should contain mavenVersion key',
  );
  // therefore, only independent objects are compared
  delete result.plugin.meta;
  t.same(result, expected, assertMessage);
}
