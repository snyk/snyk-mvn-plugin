import { legacyPlugin } from '@snyk/cli-interface';
import * as depGraphLib from '@snyk/dep-graph';
import * as path from 'path';
import * as test from 'tap-only';
import * as plugin from '../../../lib';
import { readFixtureJSON } from '../../helpers/read';
import { mockSnykSearchClient } from '../../helpers/mock-search';

const testsPath = path.join(__dirname, '../..');
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

test('inspect on altered jar marks package as unknown', async (t) => {
  const result = await plugin.inspect(
    badPath,
    'jackson-databind-2.9.9.jar',
    undefined,
    mockSnykSearchClient,
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const pkgs = result.dependencyGraph?.getDepPkgs() || [];
  t.equal(pkgs.length, 1, 'dep-graph contains one package');
  t.match(
    pkgs[0].name,
    /unknown:.*jackson-databind-2\.9\.9\.jar:[a-zA-Z0-9]{40}/,
    'package has expected name format',
  );
  t.equal(pkgs[0].version, 'unknown', 'unknown version');
});

test('inspect on non-existent jar', async (t) => {
  try {
    await plugin.inspect(
      __dirname,
      'nowhere-to-be-found-1.0.jar',
      undefined,
      mockSnykSearchClient,
    );
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

test('inspect on user created jar marks package as unknown', async (t) => {
  const result = await plugin.inspect(
    badPath,
    'mvn-app-1.0-SNAPSHOT.jar',
    undefined,
    mockSnykSearchClient,
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const pkgs = result.dependencyGraph?.getDepPkgs() || [];
  t.equal(pkgs.length, 1, 'dep-graph contains one package');
  t.match(
    pkgs[0].name,
    /unknown:.*mvn-app-1\.0-SNAPSHOT\.jar:[a-zA-Z0-9]{40}/,
    'package has expected name format',
  );
  t.equal(pkgs[0].version, 'unknown', 'unknown version');
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
    await plugin.inspect(
      __dirname,
      undefined,
      { scanAllUnmanaged: true },
      mockSnykSearchClient,
    );
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

test('inspect in directory with good and bad jars and --scan-all-unmanaged arg', async (t) => {
  const root = path.join(fixturesPath, 'good-and-bad');
  const result = await plugin.inspect(
    root,
    undefined,
    {
      scanAllUnmanaged: true,
    },
    mockSnykSearchClient,
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const pkgs = result.dependencyGraph?.getDepPkgs() || [];
  t.equal(pkgs.length, 2, 'dep-graph contains two packages');
  const commonsIo = pkgs.find((pkg) => pkg.name === 'commons-io:commons-io');
  t.equal(commonsIo?.version, '2.6', 'commons-io found with expected version');
  const doesNotExist = pkgs.find((pkg) =>
    pkg.name.includes('does-not-exist.jar'),
  );
  t.match(
    doesNotExist?.name,
    /unknown:.*does-not-exist\.jar:[a-zA-Z0-9]{40}/,
    'unknown package has expected name format',
  );
  t.equal(
    doesNotExist?.version,
    'unknown',
    'unknown package has unknown version',
  );
});

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
  const result = await plugin.inspect(
    root,
    targetFile,
    options,
    mockSnykSearchClient,
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = depGraphLib.createFromJSON(
    await readFixtureJSON(fixtureDirectory, 'dep-graph.json'),
  );
  t.ok(result.dependencyGraph?.equals(expected), 'dep-graphs are equal');
}
