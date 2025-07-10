import * as path from 'path';
import { buildDepGraph } from '../../../lib/parse/dep-graph';
import { createMavenPurlWithChecksum } from '../../../lib/fingerprint';
import type { MavenGraph, FingerprintData } from '../../../lib/parse/types';

describe('fingerprint integration', () => {
  test('buildDepGraph integration with fingerprint data', async () => {
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

    expect(depGraph).toBeDefined();

    // Convert to JSON to inspect PURLs
    const depGraphJson = depGraph.toJSON();

    // Find the junit node
    const junitNode = depGraphJson.graph.nodes.find(
      (node) => node.nodeId === 'junit:junit:jar:4.13.2:test',
    );

    expect(junitNode).toBeDefined();

    // Find the junit package info
    const junitPkg = depGraphJson.pkgs.find(
      (pkg) => pkg.id === 'junit:junit@4.13.2',
    );

    expect(junitPkg).toBeDefined();
    expect((junitPkg?.info as any)?.purl).toBeDefined();

    // Check that PURL contains checksum
    const purl = (junitPkg?.info as any)?.purl;
    expect(purl).toContain('checksum=sha256:abc123def456');
  });

  test('buildDepGraph with error fingerprint data', async () => {
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

    expect(missingNode).toBeDefined();

    // Find the missing package info
    const missingPkg = depGraphJson.pkgs.find(
      (pkg) => pkg.id === 'missing:artifact@1.0.0',
    );

    expect(missingPkg).toBeDefined();
    expect((missingPkg?.info as any)?.purl).toBeDefined();

  // Check that PURL does not contain checksum when there's an error
  const purl = (missingPkg?.info as any)?.purl;
    expect(purl).not.toContain('checksum=');
  });

  test('buildDepGraph with empty fingerprint map', async () => {
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

    expect(slf4jNode).toBeDefined();

    // Find the slf4j package info
    const slf4jPkg = depGraphJson.pkgs.find(
      (pkg) => pkg.id === 'org.slf4j:slf4j-api@1.7.36',
    );

    expect(slf4jPkg).toBeDefined();
    expect((slf4jPkg?.info as any)?.purl).toBeDefined();

  // Check that PURL does not contain checksum when no fingerprint data
  const purl = (slf4jPkg?.info as any)?.purl;
    expect(purl).not.toContain('checksum=');
  });

  test('buildDepGraph verbose mode with fingerprints', async () => {
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

    expect(commonsNode).toBeDefined();

    // Find the commons-logging package info
    const commonsPkg = depGraphJson.pkgs.find(
      (pkg) => pkg.id === 'commons-logging:commons-logging@1.2',
    );

    expect(commonsPkg).toBeDefined();
    expect((commonsPkg?.info as any)?.purl).toBeDefined();

    // Check that PURL contains checksum in verbose mode
    const purl = (commonsPkg?.info as any)?.purl;
    expect(purl).toContain('checksum=sha1:def456ghi789');
  });

  test('createMavenPurlWithChecksum function', async () => {
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

    expect(purl).toContain('checksum=sha256:testfingerprint123');
    expect(
      purl.startsWith('pkg:maven/com.example/test-artifact@1.0.0'),
    ).toBeTruthy();

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

    expect(errorPurl).toBe('pkg:maven/com.example/test-artifact@1.0.0');
    expect(errorPurl).not.toContain('checksum=');
  });
});
