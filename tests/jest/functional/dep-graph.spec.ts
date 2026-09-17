import { parseDigraphs } from '../../../lib/parse/digraph';
import { buildDepGraph } from '../../../lib/parse/dep-graph';
import type { ParseContext } from '../../../lib/parse/types';

describe('buildDepGraph', () => {
  test('should build dependency graph correctly', async () => {
    // input:
    //   root -> a -> b -> a (cycle)
    //   root -> c -> d
    //   root -> d
    // expected:
    //   root -> a -> b -> a:pruned(cyclic)
    //   root -> c -> d:pruned(seen at top level)
    //   root -> d
    const diGraph = `"test:root:jar:1.2.3" {
      "test:root:jar:1.2.3" -> "test:a:jar:1.0.0" ;
      "test:root:jar:1.2.3" -> "test:c:jar:1.0.0" ;
      "test:root:jar:1.2.3" -> "test:d:jar:1.0.0" ;
      "test:a:jar:1.0.0" -> "test:b:jar:1.0.0" ;
      "test:b:jar:1.0.0" -> "test:a:jar:1.0.0" ; // pruned (cyclic)
      "test:c:jar:1.0.0" -> "test:d:jar:1.0.3" ; // pruned (first seen at top level)
    }`;
    const mavenGraph = parseDigraphs([diGraph])[0];
    const context: ParseContext = {
      includeTestScope: false,
      verboseEnabled: false,
      fingerprintMap: new Map(),
      includePurl: false,
    };
    const depGraph = buildDepGraph(mavenGraph, context);
    expect(depGraph.toJSON()).toEqual({
      schemaVersion: '1.3.0',
      pkgManager: {
        name: 'maven',
      },
      pkgs: [
        {
          id: 'test:root@1.2.3',
          info: {
            name: 'test:root',
            version: '1.2.3',
          },
        },
        {
          id: 'test:a@1.0.0',
          info: {
            name: 'test:a',
            version: '1.0.0',
          },
        },
        {
          id: 'test:c@1.0.0',
          info: {
            name: 'test:c',
            version: '1.0.0',
          },
        },
        {
          id: 'test:d@1.0.0',
          info: {
            name: 'test:d',
            version: '1.0.0',
          },
        },
        {
          id: 'test:b@1.0.0',
          info: {
            name: 'test:b',
            version: '1.0.0',
          },
        },
      ],
      graph: {
        rootNodeId: 'root-node',
        nodes: [
          {
            nodeId: 'root-node',
            pkgId: 'test:root@1.2.3',
            deps: [
              {
                nodeId: 'test:a:jar:1.0.0',
              },
              {
                nodeId: 'test:c:jar:1.0.0',
              },
              {
                nodeId: 'test:d:jar:1.0.0',
              },
            ],
          },
          {
            nodeId: 'test:a:jar:1.0.0',
            pkgId: 'test:a@1.0.0',
            deps: [
              {
                nodeId: 'test:b:jar:1.0.0',
              },
            ],
          },
          {
            nodeId: 'test:c:jar:1.0.0',
            pkgId: 'test:c@1.0.0',
            deps: [
              {
                nodeId: 'test:d:jar:1.0.0:pruned',
              },
            ],
          },
          {
            nodeId: 'test:d:jar:1.0.0',
            pkgId: 'test:d@1.0.0',
            deps: [],
          },
          {
            nodeId: 'test:b:jar:1.0.0',
            pkgId: 'test:b@1.0.0',
            deps: [
              {
                nodeId: 'test:a:jar:1.0.0:pruned',
              },
            ],
          },
          {
            nodeId: 'test:d:jar:1.0.0:pruned',
            pkgId: 'test:d@1.0.0',
            deps: [],
            info: {
              labels: {
                pruned: 'true',
              },
            },
          },
          {
            nodeId: 'test:a:jar:1.0.0:pruned',
            pkgId: 'test:a@1.0.0',
            deps: [],
            info: {
              labels: {
                pruned: 'true',
              },
            },
          },
        ],
      },
    });
  });

  /**
   * Maven output hides previously seen dependencies.
   * We need to ensure that we don't drop non-test dependencies that are
   * transitively nested under `test` scoped dependencies.
   */
  test('should build dependency graph with test deps that introduce prod deps', async () => {
    // input:
    //   root -> a:test -> b:test -> c:compile -> d:test -> e:test
    // expected:
    //   root -> a:test -> b:test -> c:compile
    const diGraph = `"example:root:jar:1.2.3" {
      "example:root:jar:1.2.3" -> "example:a:jar:1.0.0:test" ;
      "example:a:jar:1.0.0:test" -> "example:b:jar:1.0.0:test" ;
      "example:b:jar:1.0.0:test" -> "example:c:jar:1.0.0:compile" ;
      "example:c:jar:1.0.0:compile" -> "example:d:jar:1.0.0:test" ;
      "example:d:jar:1.0.0:test" -> "example:e:jar:1.0.0:test" ;
    }`;
    const mavenGraph = parseDigraphs([diGraph])[0];
    const context: ParseContext = {
      includeTestScope: false,
      verboseEnabled: false,
      fingerprintMap: new Map(),
      includePurl: false,
    };
    const depGraph = buildDepGraph(mavenGraph, context);
    expect(depGraph.toJSON()).toEqual({
      schemaVersion: '1.3.0',
      pkgManager: {
        name: 'maven',
      },
      pkgs: [
        {
          id: 'example:root@1.2.3',
          info: {
            name: 'example:root',
            version: '1.2.3',
          },
        },
        {
          id: 'example:a@1.0.0',
          info: {
            name: 'example:a',
            version: '1.0.0',
          },
        },
        {
          id: 'example:b@1.0.0',
          info: {
            name: 'example:b',
            version: '1.0.0',
          },
        },
        {
          id: 'example:c@1.0.0',
          info: {
            name: 'example:c',
            version: '1.0.0',
          },
        },
      ],
      graph: {
        rootNodeId: 'root-node',
        nodes: [
          {
            nodeId: 'root-node',
            pkgId: 'example:root@1.2.3',
            deps: [
              {
                nodeId: 'example:a:jar:1.0.0:test',
              },
            ],
          },
          {
            nodeId: 'example:a:jar:1.0.0:test',
            pkgId: 'example:a@1.0.0',
            deps: [
              {
                nodeId: 'example:b:jar:1.0.0:test',
              },
            ],
          },
          {
            nodeId: 'example:b:jar:1.0.0:test',
            pkgId: 'example:b@1.0.0',
            deps: [
              {
                nodeId: 'example:c:jar:1.0.0:compile',
              },
            ],
          },
          {
            nodeId: 'example:c:jar:1.0.0:compile',
            pkgId: 'example:c@1.0.0',
            deps: [],
          },
        ],
      },
    });
  });
  test('should build a duplicate-heavy verbose graph in linear time', () => {
    // Regression guard for exponential graph-build time in buildWithVerbose.
    // Every node below is reachable via many distinct paths, which is the
    // ordinary shape of a large multi-module reactor's verbose dependency
    // tree. Re-expanding an already-visited node's children once per
    // incoming path makes the traversal O(paths) instead of
    // O(nodes + edges); at 32 nodes that took ~167s, against ~1ms here.
    // The graph is identical either way, so elapsed time is the only thing
    // that can assert the complexity class - hence a wall-clock budget, set
    // three orders of magnitude above the linear cost so it cannot flake.
    const nodeCount = 32;
    const fanout = 3;
    const id = (i: number) =>
      `example:p${String(i).padStart(4, '0')}:jar:1.0.0:compile`;
    const root = 'example:root:jar:1.0.0';
    const lines: string[] = [];
    for (let i = 1; i <= fanout; i++) {
      lines.push(`"${root}" -> "${id(i)}" ;`);
    }
    for (let i = 1; i <= nodeCount; i++) {
      for (let k = 1; k <= fanout; k++) {
        if (i + k <= nodeCount) {
          lines.push(`"${id(i)}" -> "${id(i + k)}" ;`);
        }
      }
    }
    const mavenGraph = parseDigraphs([
      `"${root}" {\n${lines.join('\n')}\n}`,
    ])[0];
    const context: ParseContext = {
      includeTestScope: false,
      verboseEnabled: true,
      fingerprintMap: new Map(),
      includePurl: false,
    };

    const startedAt = Date.now();
    const depGraph = buildDepGraph(mavenGraph, context);
    const elapsed = Date.now() - startedAt;

    // root + every generated package, each added exactly once
    expect(depGraph.getPkgs()).toHaveLength(nodeCount + 1);
    expect(elapsed).toBeLessThan(5000);
  });
});
