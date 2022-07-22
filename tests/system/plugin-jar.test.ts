import { legacyPlugin } from '@snyk/cli-interface';
import * as depGraphLib from '@snyk/dep-graph';
import * as path from 'path';
import * as test from 'tap-only';
import * as plugin from '../../lib';
import { readFixtureJSON } from '../file-helper';

const testsPath = path.join(__dirname, '..');
const fixturesPath = path.join(testsPath, 'fixtures');
const badPath = path.join(fixturesPath, 'bad');

test('inspect with spring-core jar file', async (t) =>
  assertFixture({
    t,
    fixtureDirectory: 'spring-core',
    targetFile: 'spring-core-5.1.8.RELEASE.jar',
  }));

test('inspect with aar file', async (t) =>
  assertFixture({
    t,
    fixtureDirectory: 'aar',
    targetFile: 'library-1.1.0.aar',
  }));

test('inspect on altered jar', async (t) => {
  try {
    await plugin.inspect(badPath, 'jackson-databind-2.9.9.jar');
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      const expectedPath = path.join(badPath, 'jackson-databind-2.9.9.jar');
      t.equal(
        err.message,
        `There was a problem generating a dep-graph for '${expectedPath}'. ` +
          `Detected supported file(s) in '${badPath}', but there was a problem generating a dep-graph. ` +
          'No Maven artifacts found when searching https://search.maven.org/solrsearch/select',
        'should throw expected error',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect on non-existent jar', async (t) => {
  try {
    await plugin.inspect(__dirname, 'nowhere-to-be-found-1.0.jar');
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      const expectedPath = path.join(__dirname, 'nowhere-to-be-found-1.0.jar');
      t.equal(
        err.message,
        'Could not find file or directory ' + expectedPath,
        'should throw expected error',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect on user created jar (same as altered)', async (t) => {
  try {
    await plugin.inspect(badPath, 'mvn-app-1.0-SNAPSHOT.jar');
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      const expectedPath = path.join(badPath, 'mvn-app-1.0-SNAPSHOT.jar');
      t.equal(
        err.message,
        `There was a problem generating a dep-graph for '${expectedPath}'. ` +
          `Detected supported file(s) in '${badPath}', but there was a problem generating a dep-graph. ` +
          'No Maven artifacts found when searching https://search.maven.org/solrsearch/select',
        'should throw expected error',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect in directory with jars no target file and --scan-all-unmanaged arg', async (t) =>
  assertFixture({
    t,
    fixtureDirectory: 'jars',
    options: { scanAllUnmanaged: true },
  }));

test('inspect on target pom file in directory with jars and --scan-all-unmanaged arg', async (t) =>
  assertFixture({
    t,
    fixtureDirectory: 'jars',
    targetFile: 'pom.xml',
    options: { scanAllUnmanaged: true },
  }));

test('inspect in directory with no jars no target file and --scan-all-unmanaged arg', async (t) => {
  try {
    await plugin.inspect(__dirname, undefined, { scanAllUnmanaged: true });
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      t.equal(
        err.message,
        `Could not find any supported files in '${__dirname}'.`,
        'should throw error with message could not find supported files',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect in directory with good and bad jars and --scan-all-unmanaged arg', async (t) =>
  assertFixture({
    t,
    fixtureDirectory: 'good-and-bad',
    options: { scanAllUnmanaged: true },
  }));

test('inspect in directory with jar with wrong package name and --scan-all-unmanaged arg', async (t) =>
  assertFixture({
    t,
    fixtureDirectory: 'jar-wrong-package-name',
    options: { scanAllUnmanaged: true },
  }));

test('inspect in directory with jars no target file and --scan-all-unmanaged and --all-projects args', async (t) =>
  assertFixture({
    t,
    fixtureDirectory: 'nested-jars',
    options: { scanAllUnmanaged: true, allProjects: true },
  }));

async function assertFixture({
  t,
  fixtureDirectory,
  targetFile,
  options,
}: {
  t: any;
  fixtureDirectory: string;
  targetFile?: string;
  options?: any;
}) {
  const root = path.join(fixturesPath, fixtureDirectory);
  const result = await plugin.inspect(root, targetFile, options);
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = depGraphLib.createFromJSON(
    await readFixtureJSON(fixtureDirectory, 'dep-graph.json'),
  );
  t.ok(result.dependencyGraph?.equals(expected), 'dep-graphs are equal');
}
