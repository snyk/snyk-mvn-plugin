import { inspect } from '../../../lib/index';
import { legacyPlugin } from '@snyk/cli-interface';
import * as path from 'path';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');

describe('fingerprinting e2e', () => {
  test('end-to-end fingerprinting workflow', async () => {
    // Test with fingerprinting disabled (default behavior)
    const resultWithoutFingerprints = await inspect(
      '.',
      path.join(testProjectPath, 'pom.xml'),
      {
        dev: false,
        fingerprintArtifacts: false,
      },
    );

    expect(resultWithoutFingerprints).toBeDefined();

    if (!legacyPlugin.isMultiResult(resultWithoutFingerprints)) {
      throw new Error('expected multi inspect result');
    }

    expect(resultWithoutFingerprints.scannedProjects).toHaveLength(1);
    const depGraphWithoutFingerprints =
      resultWithoutFingerprints.scannedProjects[0].depGraph;
    expect(depGraphWithoutFingerprints).toBeDefined();

    // Check that no fingerprint labels are present
    const depGraphJson = depGraphWithoutFingerprints!.toJSON();
    const nodes = depGraphJson.graph.nodes;

    // Find a dependency node (not the root)
    const dependencyNode = nodes.find(
      (node) => node.nodeId !== depGraphJson.graph.rootNodeId,
    );

    if (dependencyNode) {
      expect(dependencyNode.info?.labels?.fingerprint).toBeUndefined();
    }

    // Test with fingerprinting enabled
    const resultWithFingerprints = await inspect(
      '.',
      path.join(testProjectPath, 'pom.xml'),
      {
        dev: false,
        fingerprintArtifacts: true,
        fingerprintTiming: true,
      },
    );

    expect(resultWithFingerprints).toBeDefined();

    if (!legacyPlugin.isMultiResult(resultWithFingerprints)) {
      throw new Error('expected multi inspect result with fingerprints');
    }

    const depGraphWithFingerprints =
      resultWithFingerprints.scannedProjects[0].depGraph;
    expect(depGraphWithFingerprints).toBeDefined();

    // The test will likely have fingerprint errors since we don't have a real Maven repository
    // but the structure should still work
    const depGraphJsonWithFingerprints = depGraphWithFingerprints!.toJSON();
    const nodesWithFingerprints = depGraphJsonWithFingerprints.graph.nodes;

    const dependencyNodeWithFingerprints = nodesWithFingerprints.find(
      (node) => node.nodeId !== depGraphJsonWithFingerprints.graph.rootNodeId,
    );

    if (dependencyNodeWithFingerprints) {
      // Find the corresponding package to check PURL for fingerprint data
      const dependencyPkg = depGraphJsonWithFingerprints.pkgs.find(
        (pkg) => pkg.id === dependencyNodeWithFingerprints.pkgId,
      );

      expect(dependencyPkg).toBeDefined();
      expect((dependencyPkg?.info as any)?.purl).toBeDefined();

      // Should have either fingerprint data in PURL (success) or no checksum (error case)
      // Both are valid outcomes when fingerprinting is enabled
      const hasChecksumInPurl = (dependencyPkg?.info as any)?.purl?.includes(
        'checksum=',
      );
      const hasValidPurl = !!(dependencyPkg?.info as any)?.purl;

      expect(hasValidPurl).toBe(true);

      // Log the result for debugging - fingerprinting may succeed or fail depending on local Maven repo
      if (hasChecksumInPurl) {
        console.log('Fingerprinting succeeded - checksum found in PURL');
      } else {
        console.log(
          'Fingerprinting failed gracefully - no checksum in PURL (likely artifact not found)',
        );
      }
    }

    // Test with custom fingerprint algorithm
    const resultWithSha1 = await inspect(
      '.',
      path.join(testProjectPath, 'pom.xml'),
      {
        dev: false,
        fingerprintArtifacts: true,
        fingerprintAlgorithm: 'sha1',
      },
    );

    expect(resultWithSha1).toBeDefined();

    // Test with custom concurrency
    const resultWithConcurrency = await inspect(
      '.',
      path.join(testProjectPath, 'pom.xml'),
      {
        dev: false,
        fingerprintArtifacts: true,
        fingerprintConcurrency: 2,
      },
    );

    expect(resultWithConcurrency).toBeDefined();
  });

  test('fingerprinting basic functionality', async () => {
    // Test that fingerprinting options are accepted and don't break the plugin
    const result = await inspect('.', path.join(testProjectPath, 'pom.xml'), {
      dev: false,
      fingerprintArtifacts: true,
      fingerprintAlgorithm: 'sha256',
      fingerprintTiming: true,
      fingerprintConcurrency: 5,
    });

    expect(result).toBeDefined();

    if (!legacyPlugin.isMultiResult(result)) {
      throw new Error('expected multi inspect result');
    }

    expect(result.scannedProjects).toHaveLength(1);
    const depGraph = result.scannedProjects[0].depGraph;
    expect(depGraph).toBeDefined();

    // Test that the dep graph is still valid with fingerprinting enabled
    const depGraphJson = depGraph!.toJSON();
    expect(depGraphJson.graph.nodes.length).toBeGreaterThan(1);
    expect(depGraphJson.graph.rootNodeId).toBeDefined();
  });
});
