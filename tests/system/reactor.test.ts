import type { PkgInfo } from '@snyk/dep-graph';
import * as path from 'path';
import { test } from 'tap';
import { legacyPlugin } from '@snyk/cli-interface';
import * as plugin from '../../lib';
import { byPkgName } from '../helpers/sort';
import { mockSnykSearchClient } from '../helpers/mock-search';

const testsPath = path.join(__dirname, '..');
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

test('inspect on complex aggregate project using maven reactor', async (t) => {
  const result = await plugin.inspect(
    path.join(fixturesPath, 'complex-aggregate-project'),
    'pom.xml',
    {
      mavenAggregateProject: true,
    },
    mockSnykSearchClient,
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.strictEqual(
    result.scannedProjects.length,
    3,
    'should return 3 scanned projects',
  );
  t.strictEqual(
    getDepPkgs('io.snyk:aggregate-project', result)?.length,
    0,
    'root project has 0 dependencies',
  );
  t.same(
    getDepPkgs('io.snyk:core', result)?.sort(byPkgName),
    [
      { name: 'org.apache.logging.log4j:log4j-api', version: '2.17.2' },
      { name: 'org.apache.logging.log4j:log4j-core', version: '2.17.2' },
    ].sort(byPkgName),
    'core project has 2 dependencies',
  );
  t.same(
    getDepPkgs('io.snyk:web', result)?.sort(byPkgName),
    [
      // depends on another module
      { name: 'io.snyk:core', version: '1.0.0' },
      // and that modules transitives
      {
        name: 'org.apache.logging.log4j:log4j-api',
        version: '2.17.2',
      },
      // as well as its own dependencies
      {
        name: 'org.apache.logging.log4j:log4j-core',
        version: '2.17.2',
      },
      {
        name: 'org.springframework:spring-web',
        version: '5.3.21',
      },
      {
        name: 'org.springframework:spring-beans',
        version: '5.3.21',
      },
      {
        name: 'org.springframework:spring-core',
        version: '5.3.21',
      },
      {
        name: 'org.springframework:spring-jcl',
        version: '5.3.21',
      },
    ].sort(byPkgName),
    'web project has own dependencies and another modules',
  );
});
