import { parseDigraphs } from '../../../lib/parse/digraph';
import { buildDepGraph } from '../../../lib/parse/dep-graph';
import type { ParseContext } from '../../../lib/parse/types';

describe('buildDepGraph - scope labels', () => {
  describe('with showMavenBuildScope enabled', () => {
    test('should add maven:build_scope labels for all standard Maven scopes', () => {
      const diGraph = `"test:root:jar:1.0.0" {
        "test:root:jar:1.0.0" -> "test:compile-dep:jar:1.0.0:compile" ;
        "test:root:jar:1.0.0" -> "test:provided-dep:jar:1.0.0:provided" ;
        "test:root:jar:1.0.0" -> "test:runtime-dep:jar:1.0.0:runtime" ;
        "test:root:jar:1.0.0" -> "test:test-dep:jar:1.0.0:test" ;
        "test:root:jar:1.0.0" -> "test:system-dep:jar:1.0.0:system" ;
      }`;

      const mavenGraph = parseDigraphs([diGraph])[0];
      const context: ParseContext = {
        includeTestScope: true,
        verboseEnabled: false,
        fingerprintMap: new Map(),
        includePurl: false,
        showMavenBuildScope: true,
      };

      const depGraph = buildDepGraph(mavenGraph, context);
      const graphJson = depGraph.toJSON();

      const nodes = graphJson.graph.nodes;

      const compileNode = nodes.find(
        (n) => n.nodeId === 'test:compile-dep:jar:1.0.0:compile',
      );
      expect(compileNode?.info?.labels).toEqual({
        'maven:build_scope': 'compile',
      });

      const providedNode = nodes.find(
        (n) => n.nodeId === 'test:provided-dep:jar:1.0.0:provided',
      );
      expect(providedNode?.info?.labels).toEqual({
        'maven:build_scope': 'provided',
      });

      const runtimeNode = nodes.find(
        (n) => n.nodeId === 'test:runtime-dep:jar:1.0.0:runtime',
      );
      expect(runtimeNode?.info?.labels).toEqual({
        'maven:build_scope': 'runtime',
      });

      const testNode = nodes.find(
        (n) => n.nodeId === 'test:test-dep:jar:1.0.0:test',
      );
      expect(testNode?.info?.labels).toEqual({ 'maven:build_scope': 'test' });

      const systemNode = nodes.find(
        (n) => n.nodeId === 'test:system-dep:jar:1.0.0:system',
      );
      expect(systemNode?.info?.labels).toEqual({
        'maven:build_scope': 'system',
      });
    });

    test('should add maven:build_scope labels for all standard Maven scopes in verbose mode', () => {
      const diGraph = `"test:root:jar:1.0.0" {
        "test:root:jar:1.0.0" -> "test:compile-dep:jar:1.0.0:compile" ;
        "test:root:jar:1.0.0" -> "test:provided-dep:jar:1.0.0:provided" ;
        "test:root:jar:1.0.0" -> "test:runtime-dep:jar:1.0.0:runtime" ;
        "test:root:jar:1.0.0" -> "test:test-dep:jar:1.0.0:test" ;
        "test:root:jar:1.0.0" -> "test:system-dep:jar:1.0.0:system" ;
      }`;

      const mavenGraph = parseDigraphs([diGraph])[0];
      const context: ParseContext = {
        includeTestScope: true,
        verboseEnabled: true,
        fingerprintMap: new Map(),
        includePurl: false,
        showMavenBuildScope: true,
      };

      const depGraph = buildDepGraph(mavenGraph, context);
      const graphJson = depGraph.toJSON();

      const nodes = graphJson.graph.nodes;

      const compileNode = nodes.find(
        (n) => n.nodeId === 'test:compile-dep:jar:1.0.0:compile',
      );
      expect(compileNode?.info?.labels).toEqual({
        'maven:build_scope': 'compile',
      });

      const providedNode = nodes.find(
        (n) => n.nodeId === 'test:provided-dep:jar:1.0.0:provided',
      );
      expect(providedNode?.info?.labels).toEqual({
        'maven:build_scope': 'provided',
      });

      const runtimeNode = nodes.find(
        (n) => n.nodeId === 'test:runtime-dep:jar:1.0.0:runtime',
      );
      expect(runtimeNode?.info?.labels).toEqual({
        'maven:build_scope': 'runtime',
      });

      const testNode = nodes.find(
        (n) => n.nodeId === 'test:test-dep:jar:1.0.0:test',
      );
      expect(testNode?.info?.labels).toEqual({ 'maven:build_scope': 'test' });

      const systemNode = nodes.find(
        (n) => n.nodeId === 'test:system-dep:jar:1.0.0:system',
      );
      expect(systemNode?.info?.labels).toEqual({
        'maven:build_scope': 'system',
      });
    });

    test('should handle dependencies without explicit scope (default to compile)', () => {
      const diGraph = `"test:root:jar:1.0.0" {
        "test:root:jar:1.0.0" -> "test:no-scope-dep:jar:1.0.0" ;
      }`;

      const mavenGraph = parseDigraphs([diGraph])[0];
      const context: ParseContext = {
        includeTestScope: false,
        verboseEnabled: false,
        fingerprintMap: new Map(),
        includePurl: false,
        showMavenBuildScope: true,
      };

      const depGraph = buildDepGraph(mavenGraph, context);
      const graphJson = depGraph.toJSON();

      // Dependencies without explicit scope should default to 'compile' scope
      const nodes = graphJson.graph.nodes;
      const noScopeNode = nodes.find(
        (n) => n.nodeId === 'test:no-scope-dep:jar:1.0.0',
      );
      expect(noScopeNode?.info?.labels).toEqual({
        'maven:build_scope': 'compile',
      });
    });

    test('should work with cyclic dependencies', () => {
      const diGraph = `"test:root:jar:1.0.0" {
        "test:root:jar:1.0.0" -> "test:a:jar:1.0.0:compile" ;
        "test:a:jar:1.0.0:compile" -> "test:b:jar:1.0.0:runtime" ;
        "test:b:jar:1.0.0:runtime" -> "test:a:jar:1.0.0:compile" ;
      }`;

      const mavenGraph = parseDigraphs([diGraph])[0];
      const context: ParseContext = {
        includeTestScope: false,
        verboseEnabled: true, // need verbose for cycle detection
        fingerprintMap: new Map(),
        includePurl: false,
        showMavenBuildScope: true,
      };

      const depGraph = buildDepGraph(mavenGraph, context);
      const graphJson = depGraph.toJSON();

      const nodes = graphJson.graph.nodes;
      const aNode = nodes.find((n) => n.nodeId === 'test:a:jar:1.0.0:compile');
      expect(aNode?.info?.labels).toEqual({ 'maven:build_scope': 'compile' });

      const bNode = nodes.find((n) => n.nodeId === 'test:b:jar:1.0.0:runtime');
      expect(bNode?.info?.labels).toEqual({ 'maven:build_scope': 'runtime' });
    });
  });

  describe('with showMavenBuildScope disabled', () => {
    test('should not add maven:build_scope labels when flag is false', () => {
      const diGraph = `"test:root:jar:1.0.0" {
        "test:root:jar:1.0.0" -> "test:compile-dep:jar:1.0.0:compile" ;
        "test:root:jar:1.0.0" -> "test:runtime-dep:jar:1.0.0:runtime" ;
        "test:root:jar:1.0.0" -> "test:test-dep:jar:1.0.0:test" ;
      }`;

      const mavenGraph = parseDigraphs([diGraph])[0];
      const context: ParseContext = {
        includeTestScope: true,
        verboseEnabled: false,
        fingerprintMap: new Map(),
        includePurl: false,
        showMavenBuildScope: false, // disabled
      };

      const depGraph = buildDepGraph(mavenGraph, context);
      const graphJson = depGraph.toJSON();

      const nodes = graphJson.graph.nodes;
      nodes.forEach((node) => {
        if (node.nodeId !== 'root-node') {
          // skip root node
          expect(node.info?.labels?.['maven:build_scope']).toBeUndefined();
        }
      });
    });

    test('should not add maven:build_scope labels when flag is false in verbose mode', () => {
      const diGraph = `"test:root:jar:1.0.0" {
        "test:root:jar:1.0.0" -> "test:compile-dep:jar:1.0.0:compile" ;
        "test:root:jar:1.0.0" -> "test:runtime-dep:jar:1.0.0:runtime" ;
        "test:root:jar:1.0.0" -> "test:test-dep:jar:1.0.0:test" ;
      }`;

      const mavenGraph = parseDigraphs([diGraph])[0];
      const context: ParseContext = {
        includeTestScope: true,
        verboseEnabled: true,
        fingerprintMap: new Map(),
        includePurl: false,
        showMavenBuildScope: false, // disabled
      };

      const depGraph = buildDepGraph(mavenGraph, context);
      const graphJson = depGraph.toJSON();

      const nodes = graphJson.graph.nodes;
      nodes.forEach((node) => {
        if (node.nodeId !== 'root-node') {
          // skip root node
          expect(node.info?.labels?.['maven:build_scope']).toBeUndefined();
        }
      });
    });
  });
});
