import { test } from 'tap';
import { buildDepGraph } from '../../../lib/parse/dep-graph';

test('buildDepGraph', async (t) => {
  const depGraph = buildDepGraph({
    rootId: 'test:root:jar:1.2.3',
    nodes: {
      'test:root:jar:1.2.3': {
        dependsOn: ['test:a:jar:1.0.0', 'test:c:jar:1.0.0', 'test:d:jar:1.0.0'],
      },
      'test:a:jar:1.0.0': {
        dependsOn: ['test:b:jar:1.0.0'],
      },
      'test:b:jar:1.0.0': {
        dependsOn: ['test:a:jar:1.0.0'], // pruned (cyclic)
      },
      'test:c:jar:1.0.0': {
        dependsOn: ['test:d:jar:1.0.0'], // pruned (first seen at top level)
      },
      'test:d:jar:1.0.0': {
        dependsOn: [],
      },
    },
  });
  t.same(
    depGraph.toJSON(),
    {
      schemaVersion: '1.2.0',
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
    },
    'contains expected dep-graph',
  );
});
