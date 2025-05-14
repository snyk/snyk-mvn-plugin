import * as plugin from '../../../lib';
import * as path from 'path';
import { readFixtureJSON } from '../../helpers/read';
import * as subProcess from '../../../lib/sub-process';
import { sortDependencyGraphDeps } from '../../helpers/sort';
import { DepGraphData } from '@snyk/dep-graph';
import { legacyPlugin } from '@snyk/cli-interface';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'dverbose-project');
const testManagedProjectPath = path.join(
  fixturesPath,
  'dverbose-dependency-management',
);
const complexProjectPath = path.join(fixturesPath, 'complex-aggregate-project');
const TESTS_TIMEOUT = 50000;

test(
  'inspect on dverbose-project pom using -Dverbose',
  async () => {
    const res: Record<string, any> = await plugin.inspect(
      '.',
      path.join(testProjectPath, 'pom.xml'),
      {
        args: ['-Dverbose'],
      },
    );

    const expectedJSON: DepGraphData = await readFixtureJSON(
      'dverbose-project',
      'expected-dverbose-dep-graph.json',
    );
    const result = res.scannedProjects[0].depGraph.toJSON();
    const expectedGraphSorted = sortDependencyGraphDeps(expectedJSON);
    const actualGraphSorted = sortDependencyGraphDeps(result);
    expect(expectedGraphSorted).toEqual(actualGraphSorted);
    expect(
      res.plugin.meta.versionBuildInfo.metaBuildVersion.mavenPluginVersion,
    ).toEqual('3.6.1');
  },
  TESTS_TIMEOUT,
);

test(
  'inspect on dverbose-dependency-management pom using -Dverbose',
  async () => {
    const res: Record<string, any> = await plugin.inspect(
      '.',
      path.join(testManagedProjectPath, 'pom.xml'),
      {
        args: ['-Dverbose'],
      },
    );
    const result = res.scannedProjects[0].depGraph.toJSON();

    const expectedJSON = await readFixtureJSON(
      'dverbose-dependency-management',
      'expected-dverbose-dep-graph.json',
    );
    const expectedGraphSorted = sortDependencyGraphDeps(expectedJSON);
    const actualGraphSorted = sortDependencyGraphDeps(result);
    expect(expectedGraphSorted).toEqual(actualGraphSorted);
  },
  TESTS_TIMEOUT,
);

test(
  'inspect on dverbose-dependency-management pom using -Dverbose and --dev deps',
  async () => {
    const res: Record<string, any> = await plugin.inspect(
      '.',
      path.join(testManagedProjectPath, 'pom.xml'),
      {
        dev: true,
        args: ['-Dverbose'],
      },
    );
    const result = res.scannedProjects[0].depGraph.toJSON();

    // if running windows with an older version of maven 3.3.9.2 - one of the deps will be omitted
    const mavenVersion = await subProcess.execute(`mvn --version`, [], {});
    let expectedJSON = await readFixtureJSON(
      'dverbose-dependency-management',
      mavenVersion.includes('3.3.9') && mavenVersion.includes('C:')
        ? 'expected-dverbose-dep-graph-dev-old-maven.json'
        : 'expected-dverbose-dep-graph-dev.json',
    );

    const expectedGraphSorted = sortDependencyGraphDeps(expectedJSON);
    const actualGraphSorted = sortDependencyGraphDeps(result);
    expect(expectedGraphSorted).toEqual(actualGraphSorted);
  },
  TESTS_TIMEOUT,
);

test(
  'inspect on complext-aggregate-project using -Dverbose and --mavenAggregateProject deps',
  async () => {
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
      const depGraph = result.scannedProjects[i].depGraph.toJSON();
      const expectedGraphSorted = sortDependencyGraphDeps(
        expectedJSON.scannedProjects[i].depGraph,
      );
      const actualGraphSorted = sortDependencyGraphDeps(depGraph);
      expect(expectedGraphSorted).toEqual(actualGraphSorted);
    }
  },
  TESTS_TIMEOUT,
);

test(
  'inspect on dverbose-project pom using --print-graph',
  async () => {
    const res: Record<string, any> = await plugin.inspect(
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
    const result = res.scannedProjects[0].depGraph.toJSON();
    const expectedGraphSorted = sortDependencyGraphDeps(expectedJSON);
    const actualGraphSorted = sortDependencyGraphDeps(result);
    expect(expectedGraphSorted).toEqual(actualGraphSorted);
  },
  TESTS_TIMEOUT,
);

test(
  'inspect on dverbose-clashing-scopes pom using -Dverbose',
  async () => {
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
    const result = res.scannedProjects[0].depGraph.toJSON();
    const expectedGraphSorted = sortDependencyGraphDeps(expectedJSON);
    const actualGraphSorted = sortDependencyGraphDeps(result);
    expect(expectedGraphSorted).toEqual(actualGraphSorted);
  },
  TESTS_TIMEOUT,
);

test(
  'inspect on dverbose-diff-scopes-versions pom using -Dverbose',
  async () => {
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
    const result = res.scannedProjects[0].depGraph.toJSON();
    const expectedGraphSorted = sortDependencyGraphDeps(expectedJSON);
    const actualGraphSorted = sortDependencyGraphDeps(result);
    expect(expectedGraphSorted).toEqual(actualGraphSorted);
  },
  TESTS_TIMEOUT,
);

test(
  'inspect on test-project pom using -Dverbose',
  async () => {
    const fixture = 'test-project';
    const testPath = path.join(fixturesPath, fixture);
    const result = await plugin.inspect('.', path.join(testPath, 'pom.xml'), {
      args: ['-Dverbose'],
    });
    if (!legacyPlugin.isMultiResult(result)) {
      fail('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toEqual(1);
    const expectedJSON = await readFixtureJSON(
      'test-project',
      'expected-verbose-dep-graph.json',
    );
    const res = result.scannedProjects[0].depGraph?.toJSON();
    if (!res) {
      fail('expected dependency graph result');
    }
    const expectedGraphSorted = sortDependencyGraphDeps(expectedJSON);
    const actualGraphSorted = sortDependencyGraphDeps(res);
    expect(expectedGraphSorted).toEqual(actualGraphSorted);
  },
  TESTS_TIMEOUT,
);

test(
  'inspect on verbose-project pom using -Dverbose',
  async () => {
    const fixture = 'verbose-project';
    const testPath = path.join(fixturesPath, fixture);
    const result = await plugin.inspect('.', testPath, {
      args: ['-Dverbose'],
    });
    if (!legacyPlugin.isMultiResult(result)) {
      return fail('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toEqual(1);
    const expectedJSON = await readFixtureJSON(
      'verbose-project',
      'expected-verbose-dep-graph.json',
    );
    const res = result.scannedProjects[0].depGraph?.toJSON();
    if (!res) {
      fail('expected dependency graph result');
    }
    const expectedGraphSorted = sortDependencyGraphDeps(expectedJSON);
    const actualGraphSorted = sortDependencyGraphDeps(res);
    expect(expectedGraphSorted).toEqual(actualGraphSorted);
  },
  TESTS_TIMEOUT,
);
