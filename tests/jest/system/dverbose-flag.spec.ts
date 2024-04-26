import * as plugin from "../../../lib";
import * as path from 'path';
import { readFixtureJSON } from '../../helpers/read';
import * as depGraphLib from '@snyk/dep-graph';


const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'dverbose-project');

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
  },
  20000,
);
