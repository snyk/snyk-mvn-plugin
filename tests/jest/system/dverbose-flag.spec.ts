import * as plugin from '../../../lib';
import * as path from 'path';
import { readFixtureJSON } from '../../helpers/read';
import * as depGraphLib from '@snyk/dep-graph';
import * as subProcess from '../../../lib/sub-process';
import { getCommand } from '../../../lib';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'dverbose-project');
const testManagedProjectPath = path.join(
  fixturesPath,
  'dverbose-dependency-management',
);

test('inspect on dverbose-project pom using -Dverbose', async () => {
  let result: Record<string, any> = await plugin.inspect(
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
  result = result.scannedProjects[0].depGraph?.toJSON();

  expect(result).toEqual(expectedDepGraph);
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
  const mavenVersion = await subProcess.execute(
    `mvn --version`,
    [],
    {},
  );
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
