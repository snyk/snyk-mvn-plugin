import { legacyPlugin } from '@snyk/cli-interface';
import * as path from 'path';
import * as plugin from '../../../lib';
import { readFixtureJSON } from '../../helpers/read';
import { mockSnykSearchClient } from '../../helpers/mock-search';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const badPath = path.join(fixturesPath, 'bad');

test('inspect with spring-core jar file', async () =>
  await assertFixture({
    fixtureDirectory: 'spring-core',
    targetFile: 'spring-core-5.1.8.RELEASE.jar',
  }));

test('inspect with aar file', async () =>
  assertFixture({
    fixtureDirectory: 'aar',
    targetFile: 'library-1.1.0.aar',
  }));

test('inspect on altered jar marks package as unknown', async () => {
  const result = await plugin.inspect(
    badPath,
    'jackson-databind-2.9.9.jar',
    undefined,
    mockSnykSearchClient,
  );
  expect(legacyPlugin.isMultiResult(result)).toBeFalsy();

  const pkgs =
    (
      result as legacyPlugin.SinglePackageResult
    ).dependencyGraph?.getDepPkgs() || [];
  expect(pkgs.length).toEqual(1);
  expect(pkgs[0].name).toMatch(
    /unknown:.*jackson-databind-2\.9\.9\.jar:[a-zA-Z0-9]{40}/,
  );
  expect(pkgs[0].version).toEqual('unknown');
});

test('inspect on non-existent jar', async () => {
  const expectedPath = path.join(__dirname, 'nowhere-to-be-found-1.0.jar');
  await expect(
    plugin.inspect(
      __dirname,
      'nowhere-to-be-found-1.0.jar',
      undefined,
      mockSnykSearchClient,
    ),
  ).rejects.toThrow(
    expect.objectContaining({
      message: expect.stringMatching('Could not find file or directory '),
    }),
  );
});

test('inspect on user created jar marks package as unknown', async () => {
  const result = await plugin.inspect(
    badPath,
    'mvn-app-1.0-SNAPSHOT.jar',
    undefined,
    mockSnykSearchClient,
  );
  expect(legacyPlugin.isMultiResult(result)).toBeFalsy();

  const pkgs =
    (
      result as legacyPlugin.SinglePackageResult
    ).dependencyGraph?.getDepPkgs() || [];
  expect(pkgs.length).toEqual(1);
  expect(pkgs[0].name).toMatch(
    /unknown:.*mvn-app-1\.0-SNAPSHOT\.jar:c5148d1623cb6097eba45b5fa05b3358a1022f80/,
  );
  expect(pkgs[0].version).toEqual('unknown');
});

test('inspect in directory with jars no target file and --scan-all-unmanaged arg', async () =>
  assertFixture({
    fixtureDirectory: 'jars',
    options: { scanAllUnmanaged: true },
  }));

test('inspect in directory with jar that resolves to three packages with only two matching no target file and --scan-all-unmanaged arg', async () =>
  assertFixture({
    fixtureDirectory: 'two-package-jar',
    options: { scanAllUnmanaged: true },
  }));

test('inspect on target pom file in directory with jars and --scan-all-unmanaged arg', async () =>
  assertFixture({
    fixtureDirectory: 'jars',
    targetFile: 'pom.xml',
    options: { scanAllUnmanaged: true },
  }));

test('inspect in directory with no jars no target file and --scan-all-unmanaged arg', async () => {
  await expect(
    plugin.inspect(
      __dirname,
      undefined,
      { scanAllUnmanaged: true },
      mockSnykSearchClient,
    ),
  ).rejects.toThrow(
    expect.objectContaining({
      message: expect.stringContaining(
        `Could not find any supported files in '${__dirname}'.`,
      ),
    }),
  );
});

test('inspect in directory with good and bad jars and --scan-all-unmanaged arg', async () => {
  const root = path.join(fixturesPath, 'good-and-bad');
  const result = await plugin.inspect(
    root,
    undefined,
    {
      scanAllUnmanaged: true,
    },
    mockSnykSearchClient,
  );

  expect(legacyPlugin.isMultiResult(result)).toBeFalsy();

  const pkgs =
    (
      result as legacyPlugin.SinglePackageResult
    ).dependencyGraph?.getDepPkgs() || [];
  expect(pkgs.length).toEqual(2);
  const commonsIo = pkgs.find((pkg) => pkg.name === 'commons-io:commons-io');
  expect(commonsIo?.version).toEqual('2.6');
  const doesNotExist = pkgs.find((pkg) =>
    pkg.name.includes('does-not-exist.jar'),
  );

  expect(doesNotExist?.name).toMatch(
    /unknown:.*does-not-exist\.jar:[a-zA-Z0-9]{40}/,
  );
  expect(doesNotExist?.version).toEqual('unknown');
});

test('inspect in directory with jar with mismatched package name and --scan-all-unmanaged arg', async () =>
  assertFixture({
    fixtureDirectory: 'jar-wrong-package-name',
    options: { scanAllUnmanaged: true },
  }));

test('inspect in directory with jars no target file and --scan-all-unmanaged and --all-projects args', async () =>
  assertFixture({
    fixtureDirectory: 'nested-jars',
    options: { scanAllUnmanaged: true, allProjects: true },
  }));

async function assertFixture({
  fixtureDirectory,
  targetFile,
  options,
}: {
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
  expect(legacyPlugin.isMultiResult(result)).toBeFalsy();
  const expected = await readFixtureJSON(fixtureDirectory, 'dep-graph.json');
  expect(
    (result as legacyPlugin.SinglePackageResult).dependencyGraph!.toJSON(),
  ).toEqual(expected);
}
