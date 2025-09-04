import * as path from 'path';
import { legacyPlugin } from '@snyk/cli-interface';

import * as plugin from '../../../lib';
import { readFixtureJSON } from '../../helpers/read';
import * as depGraphLib from '@snyk/dep-graph';
import {
  getPluginVersionFromInspectResult,
  isPluginVersionAtLeast,
} from '../../helpers/maven-plugin-version';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');

describe('plugin.inspect', () => {
  test('should inspect test-project pom', async () => {
    const result = await plugin.inspect(
      '.',
      path.join(testProjectPath, 'pom.xml'),
    );
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'test-project',
      'expected-dep-graph.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should inspect test-project pom with --dev', async () => {
    const result = await plugin.inspect(
      '.',
      path.join(testProjectPath, 'pom.xml'),
      {
        dev: true,
      },
    );
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'test-project',
      'expected-dep-graph-with-dev.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should inspect path with spaces pom', async () => {
    const result = await plugin.inspect(
      '.',
      path.join(fixturesPath, 'path with spaces', 'pom.xml'),
    );
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'path with spaces',
      'expected-dep-graph.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should inspect relative path to test-project pom', async () => {
    const result = await plugin.inspect(
      __dirname,
      path.join('../..', 'fixtures', 'test-project', 'pom.xml'),
    );
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'test-project',
      'expected-dep-graph.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should inspect relative path to test-project dir', async () => {
    const result = await plugin.inspect(
      __dirname,
      path.join('../..', 'fixtures', 'test-project'),
    );
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'test-project',
      'expected-dep-graph.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should inspect root that contains pom.xml and no target file', async () => {
    const result = await plugin.inspect(testProjectPath);
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'test-project',
      'expected-dep-graph.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should throw error when inspecting root that does not contain a pom.xml and no target file', async () => {
    let thrownError: Error;

    try {
      await plugin.inspect(__dirname);
      fail('Expected plugin.inspect to throw');
    } catch (error) {
      thrownError = error as Error;
    }

    expect(thrownError.message).toMatch(
      'Child process failed with exit code: 1.',
    );
    expect(thrownError.message).toMatch('there is no POM in this directory');
  });

  test('should throw error when inspecting pom with dependency plugin version less than 2.2', async () => {
    await expect(
      plugin.inspect('.', path.join(fixturesPath, 'bad', 'pom.plugin.xml'), {
        dev: true,
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringMatching(
          'Please make sure that Apache Maven Dependency Plugin version 2.2 or above',
        ),
      }),
    );
  });

  test('should handle pom with bad dependency using maven 3.5.4', async () => {
    try {
      const result = await plugin.inspect(
        '.',
        path.join(fixturesPath, 'bad', 'pom.xml'),
        {
          dev: true,
        },
      );

      // If inspect succeeds, check if this is due to newer plugin version behavior
      const pluginVersion = getPluginVersionFromInspectResult(result);
      if (isPluginVersionAtLeast(pluginVersion, '3.3.0')) {
        // Skip test due to newer plugin behavior
        return;
      }

      // If we get here, the test should have failed
      throw new Error(
        `expected inspect using dependency plugin '${pluginVersion}' to throw error`,
      );
    } catch (err) {
      if (err instanceof Error) {
        expect(err.message).toMatch('BUILD FAILURE');
        expect(err.message).toMatch(
          'no.such.groupId:no.such.artifactId:jar:1.0.0',
        );
      } else {
        throw new Error('error is not instance of Error');
      }
    }
  });

  test('should inspect pom that logs an error but succeeds', async () => {
    const result = await plugin.inspect(
      __dirname,
      path.join(
        '../..',
        'fixtures',
        'successful-build-with-error-log',
        'pom.xml',
      ),
      {},
    );

    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }

    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'successful-build-with-error-log',
      'expected-dep-graph.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    console.log(JSON.stringify(result.scannedProjects[0].depGraph));
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should throw error on mvn error', async () => {
    const targetFile = path.join(fixturesPath, 'bad', 'pom.xml');
    const fullCommand = `mvn dependency:tree -DoutputType=dot --batch-mode --non-recursive --file="${targetFile}"`;

    try {
      const result = await plugin.inspect('.', targetFile, {
        dev: true,
      });

      // If inspect succeeds, check if this is due to newer plugin version behavior
      const pluginVersion = getPluginVersionFromInspectResult(result);
      if (isPluginVersionAtLeast(pluginVersion, '3.3.0')) {
        // Skip test due to newer plugin behavior
        return;
      }

      // If we get here, the test should have failed
      throw new Error(
        `expected inspect using dependency plugin '${pluginVersion}' to throw error`,
      );
    } catch (err) {
      if (err instanceof Error) {
        const expectedCommand =
          '\n\n' +
          'Please make sure that Apache Maven Dependency Plugin ' +
          'version 2.2 or above is installed, and that `' +
          fullCommand +
          '` executes successfully ' +
          'on this project.\n\n' +
          'If the problem persists, collect the output of `' +
          'DEBUG=* ' +
          fullCommand +
          '` and contact support@snyk.io\n';
        expect(err.message).toMatch(expectedCommand);
      } else {
        throw new Error('error is not instance of Error');
      }
    }
  });

  test('should throw error on mvnw error', async () => {
    const targetFile = path.join(
      fixturesPath,
      'bad-maven-with-mvnw',
      'pom.xml',
    );

    await expect(
      plugin.inspect('.', targetFile, {
        dev: true,
      }),
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.stringMatching(
          '\\[WARNING\\] The POM for no.such.groupId:no.such.artifactId:jar:1.0.0 is missing, no dependency information available',
        ),
      }),
    );
  });

  test('should successfully inspect mvnw project', async () => {
    const result = await plugin.inspect(
      path.join(fixturesPath, 'maven-with-mvnw'),
    );
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'test-project',
      'expected-dep-graph.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should successfully inspect mvnw project with targetFile', async () => {
    const result = await plugin.inspect(
      '.',
      path.join(fixturesPath, 'maven-with-mvnw', 'pom.xml'),
    );
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'test-project',
      'expected-dep-graph.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should successfully inspect mvnw when resides in parent directory with targetFile', async () => {
    const result = await plugin.inspect(
      path.join(fixturesPath, 'wrapper-at-parent'),
      path.join(fixturesPath, 'wrapper-at-parent', 'project-a', 'pom.xml'),
    );
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    const expectedJSON = await readFixtureJSON(
      'test-project',
      'expected-dep-graph.json',
    );
    const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
    expect(
      result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    ).toBeTruthy();
  });

  test('should inspect aggregate project root pom', async () => {
    const result = await plugin.inspect(
      path.join(fixturesPath, 'aggregate-project'),
      'pom.xml',
    );
    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }
    expect(result.scannedProjects.length).toBe(1);
    expect(result.scannedProjects[0].depGraph?.rootPkg).toEqual({
      name: 'io.snyk:my-app',
      version: '1.2.3',
    });
    expect(result.scannedProjects[0].depGraph?.getDepPkgs().length).toBe(0);
  });
});
