import type { PkgInfo } from '@snyk/dep-graph';
import * as path from 'path';
import { legacyPlugin } from '@snyk/cli-interface';
import * as plugin from '../../../lib';
import { byPkgName, sortDependencyGraphDeps } from '../../helpers/sort';
import { readFixtureJSON } from '../../helpers/read';
import { MultiProjectResult } from '@snyk/cli-interface/legacy/plugin';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');

function getDepPkgs(
  rootPkgName: string,
  result: legacyPlugin.MultiProjectResult,
): PkgInfo[] | undefined {
  const project = result.scannedProjects.find(
    (p) => p.depGraph?.rootPkg.name === rootPkgName,
  );
  return project?.depGraph?.getDepPkgs();
}

test('inspect on complex aggregate project using maven reactor', async () => {
  const res = await plugin.inspect(
    path.join(fixturesPath, 'complex-aggregate-project'),
    'pom.xml',
    {
      mavenAggregateProject: true,
    },
  );
  expect(legacyPlugin.isMultiResult(res)).toBeTruthy();
  const result: MultiProjectResult = res as any;

  expect(result.scannedProjects.length).toEqual(3);
  expect(getDepPkgs('io.snyk:aggregate-project', result)?.length).toEqual(0);
  expect(getDepPkgs('io.snyk:core', result)?.sort(byPkgName)).toEqual(
    [
      {
        name: 'org.apache.logging.log4j:log4j-api',
        version: '2.17.2',
        purl: 'pkg:maven/org.apache.logging.log4j/log4j-api@2.17.2',
      },
      {
        name: 'org.apache.logging.log4j:log4j-core',
        version: '2.17.2',
        purl: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.17.2',
      },
    ].sort(byPkgName),
  );
  expect(getDepPkgs('io.snyk:web', result)?.sort(byPkgName)).toEqual(
    [
      // depends on another module
      {
        name: 'io.snyk:core',
        version: '1.0.0',
        purl: 'pkg:maven/io.snyk/core@1.0.0',
      },
      // and that modules transitives
      {
        name: 'org.apache.logging.log4j:log4j-api',
        version: '2.17.2',
        purl: 'pkg:maven/org.apache.logging.log4j/log4j-api@2.17.2',
      },
      // as well as its own dependencies
      {
        name: 'org.springframework:spring-web',
        version: '5.3.21',
        purl: 'pkg:maven/org.springframework/spring-web@5.3.21',
      },
      {
        name: 'org.springframework:spring-beans',
        version: '5.3.21',
        purl: 'pkg:maven/org.springframework/spring-beans@5.3.21',
      },
      {
        name: 'org.springframework:spring-core',
        version: '5.3.21',
        purl: 'pkg:maven/org.springframework/spring-core@5.3.21',
      },
      {
        name: 'org.springframework:spring-jcl',
        version: '5.3.21',
        purl: 'pkg:maven/org.springframework/spring-jcl@5.3.21',
      },
      {
        name: 'org.apache.logging.log4j:log4j-core',
        version: '2.17.2',
        purl: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.17.2',
      },
    ].sort(byPkgName),
  );

  expect(
    result.plugin.meta!.versionBuildInfo!.metaBuildVersion.mavenPluginVersion,
  ).toEqual('2.8');
}, 20000);

test('inspect on complex aggregate project using maven reactor include test scope', async () => {
  const res = await plugin.inspect(
    path.join(fixturesPath, 'complex-aggregate-project'),
    'pom.xml',
    {
      mavenAggregateProject: true,
      dev: true,
    },
  );

  expect(legacyPlugin.isMultiResult(res)).toBeTruthy();
  const result: MultiProjectResult = res as any;

  expect(getDepPkgs('io.snyk:web', result)?.sort(byPkgName)).toEqual(
    [
      // depends on another module
      {
        name: 'io.snyk:core',
        version: '1.0.0',
        purl: 'pkg:maven/io.snyk/core@1.0.0',
      },
      // and that modules transitives
      {
        name: 'org.apache.logging.log4j:log4j-api',
        version: '2.17.2',
        purl: 'pkg:maven/org.apache.logging.log4j/log4j-api@2.17.2',
      },
      // as well as its own dependencies
      {
        name: 'org.apache.logging.log4j:log4j-core',
        version: '2.17.2',
        purl: 'pkg:maven/org.apache.logging.log4j/log4j-core@2.17.2',
      },
      {
        name: 'org.springframework:spring-web',
        version: '5.3.21',
        purl: 'pkg:maven/org.springframework/spring-web@5.3.21',
      },
      {
        name: 'org.springframework:spring-beans',
        version: '5.3.21',
        purl: 'pkg:maven/org.springframework/spring-beans@5.3.21',
      },
      {
        name: 'org.springframework:spring-core',
        version: '5.3.21',
        purl: 'pkg:maven/org.springframework/spring-core@5.3.21',
      },
      {
        name: 'org.springframework:spring-jcl',
        version: '5.3.21',
        purl: 'pkg:maven/org.springframework/spring-jcl@5.3.21',
      },
      // includes test dependencies (when --dev used)
      {
        name: 'org.junit.jupiter:junit-jupiter-api',
        version: '5.8.1',
        purl: 'pkg:maven/org.junit.jupiter/junit-jupiter-api@5.8.1',
      },
      {
        name: 'org.junit.jupiter:junit-jupiter-engine',
        version: '5.8.1',
        purl: 'pkg:maven/org.junit.jupiter/junit-jupiter-engine@5.8.1',
      },
      {
        name: 'org.junit.platform:junit-platform-engine',
        version: '1.8.1',
        purl: 'pkg:maven/org.junit.platform/junit-platform-engine@1.8.1',
      },
      {
        name: 'org.junit.platform:junit-platform-commons',
        version: '1.8.1',
        purl: 'pkg:maven/org.junit.platform/junit-platform-commons@1.8.1',
      },
      {
        name: 'org.apiguardian:apiguardian-api',
        version: '1.1.2',
        purl: 'pkg:maven/org.apiguardian/apiguardian-api@1.1.2',
      },
      {
        name: 'org.opentest4j:opentest4j',
        version: '1.2.0',
        purl: 'pkg:maven/org.opentest4j/opentest4j@1.2.0',
      },
    ].sort(byPkgName),
  );
}, 20000);

test('inspect on complex aggregate project using maven reactor and verbose enabled', async () => {
  const res = await plugin.inspect(
    path.join(fixturesPath, 'complex-aggregate-project'),
    'pom.xml',
    {
      mavenAggregateProject: true,
      args: ['-Dverbose'],
    },
  );

  expect(legacyPlugin.isMultiResult(res)).toBeTruthy();
  const result: MultiProjectResult = res as any;

  const expectedJSON = await readFixtureJSON(
    'complex-aggregate-project',
    'verbose-scan-result.json',
  );
  expect(result.scannedProjects.length).toEqual(3);

  if (!result.scannedProjects[0].depGraph) {
    fail('expected dependency graph result');
  }
  expect(
    sortDependencyGraphDeps(result.scannedProjects[0].depGraph.toJSON()),
  ).toEqual(sortDependencyGraphDeps(expectedJSON.scannedProjects[0].depGraph));

  if (!result.scannedProjects[1].depGraph) {
    fail('expected dependency graph result');
  }
  expect(
    sortDependencyGraphDeps(result.scannedProjects[1].depGraph.toJSON()),
  ).toEqual(sortDependencyGraphDeps(expectedJSON.scannedProjects[1].depGraph));

  if (!result.scannedProjects[2].depGraph) {
    fail('expected dependency graph result');
  }
  expect(
    sortDependencyGraphDeps(result.scannedProjects[2].depGraph.toJSON()),
  ).toEqual(sortDependencyGraphDeps(expectedJSON.scannedProjects[2].depGraph));
}, 60000);
