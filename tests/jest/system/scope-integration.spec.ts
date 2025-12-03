import * as path from 'path';
import { legacyPlugin } from '@snyk/cli-interface';

import { inspect } from '../../../lib';
import type { MavenOptions } from '../../../lib';

describe('Maven Scope Integration Tests', () => {
  const fixturesPath = path.resolve(__dirname, '../../fixtures/maven-scopes');

  describe('when showMavenBuildScope enabled', () => {
    describe('when includeTestScope enabled', () => {
      const baseOptions: MavenOptions = {
        dev: true,
        scanAllUnmanaged: false,
        'print-graph': true,
        mavenVerboseIncludeAllVersions: false,
        showMavenBuildScope: true, // Enable scope labels
      };

      test('should handle all Maven scopes correctly', async () => {
        const result = await inspect(
          fixturesPath,
          'pom-all-scopes.xml',
          baseOptions,
        );

        if (!legacyPlugin.isMultiResult(result)) {
          throw new Error('expected multi inspect result');
        }

        expect(result.scannedProjects).toBeDefined();
        expect(result.scannedProjects.length).toBeGreaterThan(0);

        const depGraph = result.scannedProjects[0].depGraph;
        expect(depGraph).toBeDefined();

        if (!depGraph) {
          throw new Error('depGraph is undefined');
        }

        const graphJson = depGraph.toJSON();
        const nodes = graphJson.graph.nodes;

        // Filter out the root node since it represents the project itself, not a dependency
        const dependencyNodes = nodes.filter(
          (node) => node.nodeId !== 'root-node',
        );

        const scopes = dependencyNodes.map(
          (node) => node.info?.labels?.['maven:build_scope'],
        );

        expect(scopes).toContain('compile');
        expect(scopes).toContain('provided');
        expect(scopes).toContain('runtime');
        expect(scopes).toContain('test');
        expect(scopes).toContain('system');
      });

      test('should handle compile-only dependencies', async () => {
        const result = await inspect(
          fixturesPath,
          'pom-compile-only.xml',
          baseOptions,
        );

        if (!legacyPlugin.isMultiResult(result)) {
          throw new Error('expected multi inspect result');
        }

        expect(result.scannedProjects).toBeDefined();
        expect(result.scannedProjects.length).toBeGreaterThan(0);

        const depGraph = result.scannedProjects[0].depGraph;

        if (!depGraph) {
          throw new Error('depGraph is undefined');
        }

        const graphJson = depGraph.toJSON();
        const nodes = graphJson.graph.nodes;

        // Filter out the root node since it represents the project itself, not a dependency
        const dependencyNodes = nodes.filter(
          (node) => node.nodeId !== 'root-node',
        );

        dependencyNodes.forEach((node) => {
          expect(node.info?.labels?.['maven:build_scope']).toBe('compile');
        });
      });

      test('should set root node scope to "unknown"', async () => {
        const result = await inspect(
          fixturesPath,
          'pom-all-scopes.xml',
          baseOptions,
        );

        if (!legacyPlugin.isMultiResult(result)) {
          throw new Error('expected multi inspect result');
        }

        expect(result.scannedProjects).toBeDefined();
        expect(result.scannedProjects.length).toBeGreaterThan(0);

        const depGraph = result.scannedProjects[0].depGraph;
        expect(depGraph).toBeDefined();

        if (!depGraph) {
          throw new Error('depGraph is undefined');
        }

        const graphJson = depGraph.toJSON();
        const nodes = graphJson.graph.nodes;

        // Find the root node
        const rootNode = nodes.find((node) => node.nodeId === 'root-node');
        expect(rootNode).toBeDefined();
        expect(rootNode?.info?.labels?.['maven:build_scope']).toBe('unknown');
      });
    });

    describe('when includeTestScope disabled', () => {
      const baseOptions: MavenOptions = {
        dev: false,
        scanAllUnmanaged: false,
        'print-graph': true,
        mavenVerboseIncludeAllVersions: false,
        showMavenBuildScope: true,
      };

      test('should handle all Maven scopes correctly', async () => {
        const result = await inspect(
          fixturesPath,
          'pom-all-scopes.xml',
          baseOptions,
        );

        if (!legacyPlugin.isMultiResult(result)) {
          throw new Error('expected multi inspect result');
        }

        expect(result.scannedProjects).toBeDefined();
        expect(result.scannedProjects.length).toBeGreaterThan(0);

        const depGraph = result.scannedProjects[0].depGraph;
        expect(depGraph).toBeDefined();

        if (!depGraph) {
          throw new Error('depGraph is undefined');
        }

        const graphJson = depGraph.toJSON();
        const nodes = graphJson.graph.nodes;

        // Filter out the root node since it represents the project itself, not a dependency
        const dependencyNodes = nodes.filter(
          (node) => node.nodeId !== 'root-node',
        );

        const scopes = dependencyNodes.map(
          (node) => node.info?.labels?.['maven:build_scope'],
        );

        expect(scopes).toContain('compile');
        expect(scopes).toContain('provided');
        expect(scopes).toContain('runtime');
        expect(scopes).not.toContain('test');
        expect(scopes).toContain('system');
      });
    });
  });

  describe('when showMavenBuildScope disabled', () => {
    const baseOptions: MavenOptions = {
      dev: true,
      scanAllUnmanaged: false,
      'print-graph': true,
      mavenVerboseIncludeAllVersions: false,
      showMavenBuildScope: false, // Disable scope labels
    };

    test('should not add scope labels when disabled', async () => {
      const result = await inspect(
        fixturesPath,
        'pom-all-scopes.xml',
        baseOptions,
      );

      if (!legacyPlugin.isMultiResult(result)) {
        throw new Error('expected multi inspect result');
      }

      expect(result.scannedProjects).toBeDefined();
      expect(result.scannedProjects.length).toBeGreaterThan(0);

      const depGraph = result.scannedProjects[0].depGraph;

      if (!depGraph) {
        throw new Error('depGraph is undefined');
      }

      const graphJson = depGraph.toJSON();
      const nodes = graphJson.graph.nodes;

      nodes.forEach((node) => {
        expect(node.info?.labels?.['maven:build_scope']).toBeUndefined();
      });
    });
  });

  describe('when verbose mode is enabled', () => {
    describe('when showMavenBuildScope enabled', () => {
      const baseOptions: MavenOptions = {
        dev: true,
        scanAllUnmanaged: false,
        'print-graph': true,
        mavenVerboseIncludeAllVersions: true, // Enable verbose mode
        showMavenBuildScope: true, // Enable scope labels
      };

      test('should handle all Maven scopes correctly', async () => {
        const result = await inspect(
          fixturesPath,
          'pom-all-scopes.xml',
          baseOptions,
        );

        if (!legacyPlugin.isMultiResult(result)) {
          throw new Error('expected multi inspect result');
        }

        expect(result.scannedProjects).toBeDefined();
        expect(result.scannedProjects.length).toBeGreaterThan(0);

        const depGraph = result.scannedProjects[0].depGraph;
        expect(depGraph).toBeDefined();

        if (!depGraph) {
          throw new Error('depGraph is undefined');
        }

        const graphJson = depGraph.toJSON();
        const nodes = graphJson.graph.nodes;

        // Filter out the root node since it represents the project itself, not a dependency
        const dependencyNodes = nodes.filter(
          (node) => node.nodeId !== 'root-node',
        );

        const scopes = dependencyNodes.map(
          (node) => node.info?.labels?.['maven:build_scope'],
        );
        expect(scopes).toContain('compile');
        expect(scopes).toContain('provided');
        expect(scopes).toContain('runtime');
        expect(scopes).toContain('test');
        expect(scopes).toContain('system');
      });

      test('should handle compile-only dependencies', async () => {
        const result = await inspect(
          fixturesPath,
          'pom-compile-only.xml',
          baseOptions,
        );

        if (!legacyPlugin.isMultiResult(result)) {
          throw new Error('expected multi inspect result');
        }

        expect(result.scannedProjects).toBeDefined();
        expect(result.scannedProjects.length).toBeGreaterThan(0);

        const depGraph = result.scannedProjects[0].depGraph;

        if (!depGraph) {
          throw new Error('depGraph is undefined');
        }

        const graphJson = depGraph.toJSON();
        const nodes = graphJson.graph.nodes;

        // Filter out the root node since it represents the project itself, not a dependency
        const dependencyNodes = nodes.filter(
          (node) => node.nodeId !== 'root-node',
        );

        dependencyNodes.forEach((node) => {
          expect(node.info?.labels?.['maven:build_scope']).toBe('compile');
        });
      });

      test('should set root node scope to "unknown" in verbose mode', async () => {
        const result = await inspect(
          fixturesPath,
          'pom-all-scopes.xml',
          baseOptions,
        );

        if (!legacyPlugin.isMultiResult(result)) {
          throw new Error('expected multi inspect result');
        }

        expect(result.scannedProjects).toBeDefined();
        expect(result.scannedProjects.length).toBeGreaterThan(0);

        const depGraph = result.scannedProjects[0].depGraph;
        expect(depGraph).toBeDefined();

        if (!depGraph) {
          throw new Error('depGraph is undefined');
        }

        const graphJson = depGraph.toJSON();
        const nodes = graphJson.graph.nodes;

        // Find the root node
        const rootNode = nodes.find((node) => node.nodeId === 'root-node');
        expect(rootNode).toBeDefined();
        expect(rootNode?.info?.labels?.['maven:build_scope']).toBe('unknown');
      });
    });

    describe('when showMavenBuildScope disabled', () => {
      const baseOptions: MavenOptions = {
        dev: true,
        scanAllUnmanaged: false,
        'print-graph': true,
        mavenVerboseIncludeAllVersions: true, // Enable verbose mode
        showMavenBuildScope: false, // Disable scope labels
      };

      test('should not add scope labels when disabled', async () => {
        const result = await inspect(
          fixturesPath,
          'pom-all-scopes.xml',
          baseOptions,
        );

        if (!legacyPlugin.isMultiResult(result)) {
          throw new Error('expected multi inspect result');
        }

        expect(result.scannedProjects).toBeDefined();
        expect(result.scannedProjects.length).toBeGreaterThan(0);

        const depGraph = result.scannedProjects[0].depGraph;

        if (!depGraph) {
          throw new Error('depGraph is undefined');
        }

        const graphJson = depGraph.toJSON();
        const nodes = graphJson.graph.nodes;

        nodes.forEach((node) => {
          expect(node.info?.labels?.['maven:build_scope']).toBeUndefined();
        });
      });
    });
  });
});
