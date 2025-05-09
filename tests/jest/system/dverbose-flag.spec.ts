import * as plugin from '../../../lib';
import * as path from 'path';
import { readFixtureJSON } from '../../helpers/read';
import * as depGraphLib from '@snyk/dep-graph';
import * as subProcess from '../../../lib/sub-process';
import { writeFileSync } from 'fs';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'dverbose-project');
const testManagedProjectPath = path.join(
  fixturesPath,
  'dverbose-dependency-management',
);
const complexProjectPath = path.join(fixturesPath, 'complex-aggregate-project');

test('inspect on dverbose-project pom using -Dverbose', async () => {
  let res: Record<string, any> = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      args: ['-Dverbose'],
    },
  );

  const expectedJSON = await readFixtureJSON(
    'dverbose-project',
    'expected-dverbose-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON).toJSON();
  const result = res.scannedProjects[0].depGraph?.toJSON();

  expect(result).toEqual(expectedDepGraph);
  expect(
    res.plugin.meta.versionBuildInfo.metaBuildVersion.mavenPluginVersion,
  ).toEqual('3.6.1');
}, 20000);

test('inspect on dverbose-dependency-management pom using -Dverbose', async () => {
  let result: Record<string, any> = await plugin.inspect(
    '.',
    path.join(testManagedProjectPath, 'pom.xml'),
    {
      args: ['-Dverbose'],
    },
  );

  const expectedJSON = await readFixtureJSON(
    'dverbose-dependency-management',
    'expected-dverbose-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON).toJSON();
  result = result.scannedProjects[0].depGraph?.toJSON();

  expect(result).toEqual(expectedDepGraph);
}, 20000);

test('inspect on dverbose-dependency-management pom using -Dverbose and --dev deps', async () => {
  let result: Record<string, any> = await plugin.inspect(
    '.',
    path.join(testManagedProjectPath, 'pom.xml'),
    {
      dev: true,
      args: ['-Dverbose'],
    },
  );

  // if running windows with an older version of maven 3.3.9.2 - one of the deps will be omitted
  const mavenVersion = await subProcess.execute(`mvn --version`, [], {});
  let expectedJSON = await readFixtureJSON(
    'dverbose-dependency-management',
    mavenVersion.includes('3.3.9') && mavenVersion.includes('C:')
      ? 'expected-dverbose-dep-graph-dev-old-maven.json'
      : 'expected-dverbose-dep-graph-dev.json',
  );

  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON).toJSON();
  result = result.scannedProjects[0].depGraph?.toJSON();

  expect(result).toEqual(expectedDepGraph);
}, 20000);

test('inspect on complext-aggregate-project using -Dverbose and --mavenAggregateProject deps', async () => {
  let result: Record<string, any> = await plugin.inspect(
    complexProjectPath,
    'pom.xml',
    {
      args: ['-Dverbose'],
      mavenAggregateProject: true,
    },
  );

  let expectedJSON = await readFixtureJSON(
    'complex-aggregate-project',
    'verbose-scan-result.json',
  );

  expect(result.scannedProjects.length).toEqual(
    expectedJSON.scannedProjects.length,
  );
  for (let i = 0; i < result.scannedProjects.length; i++) {
    const expectedDepGraph = depGraphLib
      .createFromJSON(expectedJSON.scannedProjects[i].depGraph)
      .toJSON();
    const depGraph = result.scannedProjects[i].depGraph?.toJSON();

    expect(depGraph).toEqual(expectedDepGraph);
  }
}, 20000);

test('inspect on dverbose-project pom using --print-graph', async () => {
  let result: Record<string, any> = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      'print-graph': true,
    },
  );

  const expectedJSON = await readFixtureJSON(
    'dverbose-project',
    'expected-dverbose-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON).toJSON();
  result = result.scannedProjects[0].depGraph?.toJSON();

  expect(result).toEqual(expectedDepGraph);
}, 20000);

test('inspect on dverbose-clashing-scopes pom using -Dverbose', async () => {
  const fixture = 'dverbose-clashing-scopes';
  const testPath = path.join(fixturesPath, fixture);
  let res: Record<string, any> = await plugin.inspect(
    '.',
    path.join(testPath, 'pom.xml'),
    {
      args: ['-Dverbose'],
    },
  );

  const expectedJSON = await readFixtureJSON(
    fixture,
    'expected-dverbose-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON).toJSON();
  const result = res.scannedProjects[0].depGraph?.toJSON();
  expect(result).toEqual(expectedDepGraph);
}, 20000);

test('inspect on dverbose-diff-scopes-versions pom using -Dverbose', async () => {
  const fixture = 'dverbose-diff-scopes-versions';
  const testPath = path.join(fixturesPath, fixture);
  let res: Record<string, any> = await plugin.inspect(
    '.',
    path.join(testPath, 'pom.xml'),
    {
      args: ['-Dverbose'],
    },
  );

  const expectedJSON = await readFixtureJSON(
    fixture,
    'expected-dverbose-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON).toJSON();
  const result = res.scannedProjects[0].depGraph?.toJSON();
  expect(result).toEqual(expectedDepGraph);
}, 20000);
