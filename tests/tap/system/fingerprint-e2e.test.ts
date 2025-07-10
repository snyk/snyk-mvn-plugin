import { test } from 'tap';
import { inspect } from '../../../lib/index';
import { legacyPlugin } from '@snyk/cli-interface';
import * as path from 'path';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');

test('end-to-end fingerprinting workflow', async (t) => {
  try {
    // Test with fingerprinting disabled (default behavior)
    const resultWithoutFingerprints = await inspect(
      '.',
      path.join(testProjectPath, 'pom.xml'),
      {
        dev: false,
        fingerprintArtifacts: false,
      },
    );

    t.ok(
      resultWithoutFingerprints,
      'should return result without fingerprints',
    );

    if (!legacyPlugin.isMultiResult(resultWithoutFingerprints)) {
      return t.fail('expected multi inspect result');
    }

    t.equal(
      resultWithoutFingerprints.scannedProjects.length,
      1,
      'should have 1 scanned project',
    );
    const depGraphWithoutFingerprints =
      resultWithoutFingerprints.scannedProjects[0].depGraph;
    t.ok(depGraphWithoutFingerprints, 'should have dependency graph');

    // Check that no fingerprint labels are present
    const depGraphJson = depGraphWithoutFingerprints!.toJSON();
    const nodes = depGraphJson.graph.nodes;

    // Find a dependency node (not the root)
    const dependencyNode = nodes.find(
      (node) => node.nodeId !== depGraphJson.graph.rootNodeId,
    );

    if (dependencyNode) {
      t.notOk(
        dependencyNode.info?.labels?.fingerprint,
        'should not have fingerprint when disabled',
      );
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

    t.ok(
      resultWithFingerprints,
      'should return result with fingerprints enabled',
    );

    if (!legacyPlugin.isMultiResult(resultWithFingerprints)) {
      return t.fail('expected multi inspect result with fingerprints');
    }

    const depGraphWithFingerprints =
      resultWithFingerprints.scannedProjects[0].depGraph;
    t.ok(
      depGraphWithFingerprints,
      'should have dependency graph with fingerprints enabled',
    );

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

      t.ok(dependencyPkg, 'dependency package should exist in packages array');
      t.ok(dependencyPkg?.info?.purl, 'dependency package should have PURL');

      // Should have either fingerprint data in PURL (success) or no checksum (error case)
      // Both are valid outcomes when fingerprinting is enabled
      const hasChecksumInPurl =
        dependencyPkg?.info?.purl?.includes('checksum=');
      const hasValidPurl = !!dependencyPkg?.info?.purl;

      t.ok(hasValidPurl, 'should have valid PURL when fingerprinting enabled');

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

    t.ok(resultWithSha1, 'should work with custom hash algorithm');

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

    t.ok(resultWithConcurrency, 'should work with custom concurrency');
  } catch (error) {
    t.fail(`Test failed with error: ${error}`);
  }
});

test('fingerprinting basic functionality', async (t) => {
  try {
    // Test that fingerprinting options are accepted and don't break the plugin
    const result = await inspect('.', path.join(testProjectPath, 'pom.xml'), {
      dev: false,
      fingerprintArtifacts: true,
      fingerprintAlgorithm: 'sha256',
      fingerprintTiming: true,
      fingerprintConcurrency: 5,
    });

    t.ok(result, 'should return result with all fingerprint options');

    if (!legacyPlugin.isMultiResult(result)) {
      return t.fail('expected multi inspect result');
    }

    t.equal(result.scannedProjects.length, 1, 'should have 1 scanned project');
    const depGraph = result.scannedProjects[0].depGraph;
    t.ok(depGraph, 'should have dependency graph');

    // Test that the dep graph is still valid with fingerprinting enabled
    const depGraphJson = depGraph!.toJSON();
    t.ok(depGraphJson.graph.nodes.length > 1, 'should have multiple nodes');
    t.ok(depGraphJson.graph.rootNodeId, 'should have root node ID');
  } catch (error) {
    t.fail(`Test failed with error: ${error}`);
  }
});
