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

describe('plugin.inspect - Maven 4', () => {
  describe('Basic Maven 4 project with POM model 4.1.0', () => {
    test('should inspect maven4-basic pom', async () => {
      const result = await plugin.inspect(
        '.',
        path.join(fixturesPath, 'maven4-basic', 'pom.xml'),
      );

      if (!legacyPlugin.isMultiResult(result)) {
        throw new Error('expected multi inspect result');
      }

      expect(result.scannedProjects.length).toBe(1);

      // Verify Maven version is 4.x
      const mavenVersion =
        result.plugin.meta?.versionBuildInfo?.metaBuildVersion?.mavenVersion;
      expect(mavenVersion).toMatch(/^Apache Maven 4\./);

      // Compare with expected dep-graph
      const expectedJSON = await readFixtureJSON(
        'maven4-basic',
        'expected-dep-graph.json',
      );
      const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
      expect(
        result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
      ).toBeTruthy();
    });
  });

  describe('Maven 4 aggregate project with subprojects', () => {
    test('should inspect maven4-aggregate root pom', async () => {
      const result = await plugin.inspect(
        '.',
        path.join(fixturesPath, 'maven4-aggregate', 'pom.xml'),
      );

      if (!legacyPlugin.isMultiResult(result)) {
        throw new Error('expected multi inspect result');
      }

      expect(result.scannedProjects.length).toBe(1);

      // Verify Maven version is 4.x
      const mavenVersion =
        result.plugin.meta?.versionBuildInfo?.metaBuildVersion?.mavenVersion;
      expect(mavenVersion).toMatch(/^Apache Maven 4\./);

      // Compare with expected dep-graph
      const expectedJSON = await readFixtureJSON(
        'maven4-aggregate',
        'expected-dep-graph.json',
      );
      const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
      expect(
        result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
      ).toBeTruthy();
    });

    test('should inspect maven4-service subproject', async () => {
      const result = await plugin.inspect(
        '.',
        path.join(
          fixturesPath,
          'maven4-aggregate',
          'maven4-service',
          'pom.xml',
        ),
      );

      if (!legacyPlugin.isMultiResult(result)) {
        throw new Error('expected multi inspect result');
      }

      expect(result.scannedProjects.length).toBe(1);

      // Compare with expected dep-graph
      const expectedJSON = await readFixtureJSON(
        'maven4-aggregate/maven4-service',
        'expected-dep-graph.json',
      );
      const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
      expect(
        result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
      ).toBeTruthy();
    });
  });
});
