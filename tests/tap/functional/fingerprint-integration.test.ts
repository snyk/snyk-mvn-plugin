import * as path from 'path';
import { test } from 'tap';
import { buildDepGraph } from '../../../lib/parse/dep-graph';
import { createFingerprintLabels } from '../../../lib/fingerprint';
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
    ['junit:junit:jar:4.13.2:test', {
      hash: 'abc123def456',
      algorithm: 'sha256',
      filePath: '/path/to/junit-4.13.2.jar',
      fileSize: 384581,
      processingTime: 5.2
    }]
  ]);

  // Build dep graph with fingerprint data
  const depGraph = buildDepGraph(
    mockMavenGraph,
    true, // includeTestScope
    false, // verboseEnabled
    fingerprintMap
  );

  t.ok(depGraph, 'dep graph should be created');
  
  // Convert to JSON to inspect labels
  const depGraphJson = depGraph.toJSON();
  
  // Find the junit node
  const junitNode = depGraphJson.graph.nodes.find(
    node => node.nodeId === 'junit:junit:jar:4.13.2:test'
  );
  
  t.ok(junitNode, 'junit node should exist in dep graph');
  t.ok(junitNode?.info?.labels, 'junit node should have labels');
  t.equal(junitNode?.info?.labels?.fingerprint, 'abc123def456', 'should have correct fingerprint');
  t.equal(junitNode?.info?.labels?.fingerprintAlgorithm, 'sha256', 'should have correct algorithm');
  t.equal(junitNode?.info?.labels?.artifactPath, '/path/to/junit-4.13.2.jar', 'should have correct path');
  t.equal(junitNode?.info?.labels?.fileSize, '384581', 'should have correct file size');
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
    ['missing:artifact:jar:1.0.0', {
      hash: '',
      algorithm: 'sha256',
      filePath: '/path/to/missing-1.0.0.jar',
      fileSize: 0,
      processingTime: 1.1,
      error: 'Artifact not found in repository'
    }]
  ]);

  const depGraph = buildDepGraph(
    mockMavenGraph,
    false, // includeTestScope
    false, // verboseEnabled
    fingerprintMap
  );

  const depGraphJson = depGraph.toJSON();
  
  const missingNode = depGraphJson.graph.nodes.find(
    node => node.nodeId === 'missing:artifact:jar:1.0.0'
  );
  
  t.ok(missingNode, 'missing artifact node should exist');
  t.ok(missingNode?.info?.labels, 'missing node should have labels');
  t.equal(missingNode?.info?.labels?.fingerprintError, 'Artifact not found in repository', 'should have error message');
  t.notOk(missingNode?.info?.labels?.fingerprint, 'should not have fingerprint hash');
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
    new Map() // empty fingerprint map
  );

  const depGraphJson = depGraph.toJSON();
  
  const slf4jNode = depGraphJson.graph.nodes.find(
    node => node.nodeId === 'org.slf4j:slf4j-api:jar:1.7.36'
  );
  
  t.ok(slf4jNode, 'slf4j node should exist');
  t.notOk(slf4jNode?.info?.labels, 'node should not have labels when no fingerprint data');
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
    ['commons-logging:commons-logging:jar:1.2', {
      hash: 'def456ghi789',
      algorithm: 'sha1',
      filePath: '/path/to/commons-logging-1.2.jar',
      fileSize: 60686,
      processingTime: 3.8
    }]
  ]);

  // Test verbose mode
  const depGraph = buildDepGraph(
    mockMavenGraph,
    false,
    true, // verbose enabled
    fingerprintMap
  );

  const depGraphJson = depGraph.toJSON();
  
  const commonsNode = depGraphJson.graph.nodes.find(
    node => node.nodeId === 'commons-logging:commons-logging:jar:1.2'
  );
  
  t.ok(commonsNode, 'commons-logging node should exist in verbose mode');
  t.ok(commonsNode?.info?.labels, 'node should have labels in verbose mode');
  t.equal(commonsNode?.info?.labels?.fingerprint, 'def456ghi789', 'should have fingerprint in verbose mode');
  t.equal(commonsNode?.info?.labels?.fingerprintAlgorithm, 'sha1', 'should have correct algorithm in verbose mode');
});

test('createFingerprintLabels function', async (t) => {
  const successData: FingerprintData = {
    hash: 'testfingerprint123',
    algorithm: 'sha256',
    filePath: '/test/path.jar',
    fileSize: 12345,
    processingTime: 2.5
  };

  const labels = createFingerprintLabels(successData);
  
  t.equal(labels.fingerprint, 'testfingerprint123', 'should set fingerprint');
  t.equal(labels.fingerprintAlgorithm, 'sha256', 'should set algorithm');
  t.equal(labels.artifactPath, '/test/path.jar', 'should set artifact path');
  t.equal(labels.fileSize, '12345', 'should set file size as string');
  t.notOk(labels.fingerprintError, 'should not have error for successful fingerprint');

  const errorData: FingerprintData = {
    hash: '',
    algorithm: 'sha256',
    filePath: '/missing/path.jar',
    fileSize: 0,
    processingTime: 1.0,
    error: 'File not found'
  };

  const errorLabels = createFingerprintLabels(errorData);
  
  t.equal(errorLabels.fingerprintError, 'File not found', 'should set error message');
  t.notOk(errorLabels.fingerprint, 'should not have fingerprint for error case');
  t.notOk(errorLabels.fingerprintAlgorithm, 'should not have algorithm for error case');
}); 