import * as path from 'path';
import { test } from 'tap';
import { buildDepGraph } from '../../../lib/parse/dep-graph';
import { createMavenPurlWithChecksum } from '../../../lib/fingerprint';
import type { MavenGraph, FingerprintData } from '../../../lib/parse/types';

test('buildDepGraph integration with fingerprint data', async (t) => {
  // Create a mock MavenGraph
  const mockMavenGraph: MavenGraph = {
    rootId: 'com.example:test-app:jar:1.0.0',
    nodes: {
      'com.example:test-app:jar:1.0.0': {
        dependsOn: ['junit:junit:jar:4.13.2:test'],
        parents: [],
        reachesProdDep: false,
      },
      'junit:junit:jar:4.13.2:test': {
        dependsOn: [],
        parents: ['com.example:test-app:jar:1.0.0'],
        reachesProdDep: false,
      },
    },
  };

  // Create fingerprint data
  const fingerprintMap = new Map<string, FingerprintData>([
    [
      'junit:junit:jar:4.13.2:test',
      {
        hash: 'abc123def456',
        algorithm: 'sha256',
        filePath: '/path/to/junit-4.13.2.jar',
        fileSize: 384581,
        processingTime: 5.2,
      },
    ],
  ]);

  // Build dep graph with fingerprint data
  const depGraph = buildDepGraph(
    mockMavenGraph,
    true, // includeTestScope
    false, // verboseEnabled
    fingerprintMap,
  );

  t.ok(depGraph, 'dep graph should be created');

  // Convert to JSON to inspect PURLs
  const depGraphJson = depGraph.toJSON();

  // Find the junit node
  const junitNode = depGraphJson.graph.nodes.find(
    (node) => node.nodeId === 'junit:junit:jar:4.13.2:test',
  );

  t.ok(junitNode, 'junit node should exist in dep graph');

  // Find the junit package info
  const junitPkg = depGraphJson.pkgs.find(
    (pkg) => pkg.id === 'junit:junit@4.13.2',
  );

  t.ok(junitPkg, 'junit package should exist in dep graph');
  t.ok(junitPkg?.info?.purl, 'junit package should have PURL');

  // Check that PURL contains checksum
  const purl = junitPkg?.info?.purl;
  t.ok(
    purl?.includes('checksum=sha256:abc123def456'),
    'PURL should contain correct checksum',
  );
});

test('buildDepGraph with error fingerprint data', async (t) => {
  const mockMavenGraph: MavenGraph = {
    rootId: 'com.example:test-app:jar:1.0.0',
    nodes: {
      'com.example:test-app:jar:1.0.0': {
        dependsOn: ['missing:artifact:jar:1.0.0'],
        parents: [],
        reachesProdDep: false,
      },
      'missing:artifact:jar:1.0.0': {
        dependsOn: [],
        parents: ['com.example:test-app:jar:1.0.0'],
        reachesProdDep: false,
      },
    },
  };

  // Create fingerprint data with error
  const fingerprintMap = new Map<string, FingerprintData>([
    [
      'missing:artifact:jar:1.0.0',
      {
        hash: '',
        algorithm: 'sha256',
        filePath: '/path/to/missing-1.0.0.jar',
        fileSize: 0,
        processingTime: 1.1,
        error: 'Artifact not found in repository',
      },
    ],
  ]);

  const depGraph = buildDepGraph(
    mockMavenGraph,
    false, // includeTestScope
    false, // verboseEnabled
    fingerprintMap,
  );

  const depGraphJson = depGraph.toJSON();

  const missingNode = depGraphJson.graph.nodes.find(
    (node) => node.nodeId === 'missing:artifact:jar:1.0.0',
  );

  t.ok(missingNode, 'missing artifact node should exist');

  // Find the missing package info
  const missingPkg = depGraphJson.pkgs.find(
    (pkg) => pkg.id === 'missing:artifact@1.0.0',
  );

  t.ok(missingPkg, 'missing package should exist in dep graph');
  t.ok(missingPkg?.info?.purl, 'missing package should have PURL');

  // Check that PURL does not contain checksum when there's an error
  const purl = missingPkg?.info?.purl;
  t.notOk(
    purl?.includes('checksum='),
    'PURL should not contain checksum when there is an error',
  );
});

test('buildDepGraph with empty fingerprint map', async (t) => {
  const mockMavenGraph: MavenGraph = {
    rootId: 'com.example:test-app:jar:1.0.0',
    nodes: {
      'com.example:test-app:jar:1.0.0': {
        dependsOn: ['org.slf4j:slf4j-api:jar:1.7.36'],
        parents: [],
        reachesProdDep: false,
      },
      'org.slf4j:slf4j-api:jar:1.7.36': {
        dependsOn: [],
        parents: ['com.example:test-app:jar:1.0.0'],
        reachesProdDep: true,
      },
    },
  };

  // Build with empty fingerprint map
  const depGraph = buildDepGraph(
    mockMavenGraph,
    false,
    false,
    new Map(), // empty fingerprint map
  );

  const depGraphJson = depGraph.toJSON();

  const slf4jNode = depGraphJson.graph.nodes.find(
    (node) => node.nodeId === 'org.slf4j:slf4j-api:jar:1.7.36',
  );

  t.ok(slf4jNode, 'slf4j node should exist');

  // Find the slf4j package info
  const slf4jPkg = depGraphJson.pkgs.find(
    (pkg) => pkg.id === 'org.slf4j:slf4j-api@1.7.36',
  );

  t.ok(slf4jPkg, 'slf4j package should exist in dep graph');
  t.ok(slf4jPkg?.info?.purl, 'slf4j package should have PURL');

  // Check that PURL does not contain checksum when no fingerprint data
  const purl = slf4jPkg?.info?.purl;
  t.notOk(
    purl?.includes('checksum='),
    'PURL should not contain checksum when no fingerprint data',
  );
});

test('buildDepGraph verbose mode with fingerprints', async (t) => {
  const mockMavenGraph: MavenGraph = {
    rootId: 'com.example:test-app:jar:1.0.0',
    nodes: {
      'com.example:test-app:jar:1.0.0': {
        dependsOn: ['commons-logging:commons-logging:jar:1.2'],
        parents: [],
        reachesProdDep: false,
      },
      'commons-logging:commons-logging:jar:1.2': {
        dependsOn: [],
        parents: ['com.example:test-app:jar:1.0.0'],
        reachesProdDep: true,
      },
    },
  };

  const fingerprintMap = new Map<string, FingerprintData>([
    [
      'commons-logging:commons-logging:jar:1.2',
      {
        hash: 'def456ghi789',
        algorithm: 'sha1',
        filePath: '/path/to/commons-logging-1.2.jar',
        fileSize: 60686,
        processingTime: 3.8,
      },
    ],
  ]);

  // Test verbose mode
  const depGraph = buildDepGraph(
    mockMavenGraph,
    false,
    true, // verbose enabled
    fingerprintMap,
  );

  const depGraphJson = depGraph.toJSON();

  const commonsNode = depGraphJson.graph.nodes.find(
    (node) => node.nodeId === 'commons-logging:commons-logging:jar:1.2',
  );

  t.ok(commonsNode, 'commons-logging node should exist in verbose mode');

  // Find the commons-logging package info
  const commonsPkg = depGraphJson.pkgs.find(
    (pkg) => pkg.id === 'commons-logging:commons-logging@1.2',
  );

  t.ok(commonsPkg, 'commons-logging package should exist in dep graph');
  t.ok(commonsPkg?.info?.purl, 'commons-logging package should have PURL');

  // Check that PURL contains checksum in verbose mode
  const purl = commonsPkg?.info?.purl;
  t.ok(
    purl?.includes('checksum=sha1:def456ghi789'),
    'PURL should contain correct checksum in verbose mode',
  );
});

test('createMavenPurlWithChecksum function', async (t) => {
  const successData: FingerprintData = {
    hash: 'testfingerprint123',
    algorithm: 'sha256',
    filePath: '/test/path.jar',
    fileSize: 12345,
    processingTime: 2.5,
  };

  const purl = createMavenPurlWithChecksum(
    'com.example',
    'test-artifact',
    '1.0.0',
    successData,
  );

  t.ok(
    purl.includes('checksum=sha256:testfingerprint123'),
    'should include checksum in PURL',
  );
  t.ok(
    purl.startsWith('pkg:maven/com.example/test-artifact@1.0.0'),
    'should have correct Maven PURL format',
  );

  const errorData: FingerprintData = {
    hash: '',
    algorithm: 'sha256',
    filePath: '/missing/path.jar',
    fileSize: 0,
    processingTime: 1.0,
    error: 'File not found',
  };

  const errorPurl = createMavenPurlWithChecksum(
    'com.example',
    'test-artifact',
    '1.0.0',
    errorData,
  );

  t.equal(
    errorPurl,
    'pkg:maven/com.example/test-artifact@1.0.0',
    'should not include checksum for error case',
  );
  t.notOk(
    errorPurl.includes('checksum='),
    'should not have checksum qualifier for error case',
  );
});
