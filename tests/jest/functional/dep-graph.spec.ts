import { parseDigraphs } from '../../../lib/parse/digraph';
import { buildDepGraph } from '../../../lib/parse/dep-graph';

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
    const depGraph = buildDepGraph(mavenGraph);
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
            purl: 'pkg:maven/test/root@1.2.3',
          },
        },
        {
          id: 'test:a@1.0.0',
          info: {
            name: 'test:a',
            version: '1.0.0',
            purl: 'pkg:maven/test/a@1.0.0',
          },
        },
        {
          id: 'test:c@1.0.0',
          info: {
            name: 'test:c',
            version: '1.0.0',
            purl: 'pkg:maven/test/c@1.0.0',
          },
        },
        {
          id: 'test:d@1.0.0',
          info: {
            name: 'test:d',
            version: '1.0.0',
            purl: 'pkg:maven/test/d@1.0.0',
          },
        },
        {
          id: 'test:b@1.0.0',
          info: {
            name: 'test:b',
            version: '1.0.0',
            purl: 'pkg:maven/test/b@1.0.0',
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
    const depGraph = buildDepGraph(mavenGraph);
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
            purl: 'pkg:maven/example/root@1.2.3',
          },
        },
        {
          id: 'example:a@1.0.0',
          info: {
            name: 'example:a',
            version: '1.0.0',
            purl: 'pkg:maven/example/a@1.0.0',
          },
        },
        {
          id: 'example:b@1.0.0',
          info: {
            name: 'example:b',
            version: '1.0.0',
            purl: 'pkg:maven/example/b@1.0.0',
          },
        },
        {
          id: 'example:c@1.0.0',
          info: {
            name: 'example:c',
            version: '1.0.0',
            purl: 'pkg:maven/example/c@1.0.0',
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
});
