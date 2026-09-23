// Coverage for the verbose dependency-graph path: the option combinations and
// degenerate inputs that the cases in dep-graph.spec.ts do not reach - purls
// and fingerprint checksums, component-metadata and build-scope labels, test
// scope in both directions, mavenVerboseIncludeAllVersions, missing node ids,
// self-loops, and a dependency that points back at the project itself.

import { parseDigraphs } from '../../../lib/parse/digraph';
import { buildDepGraph } from '../../../lib/parse/dep-graph';
import type { FingerprintData, ParseContext } from '../../../lib/parse/types';

const ROOT = 'test:root:jar:1.2.3';

const context = (over: Partial<ParseContext> = {}): ParseContext => ({
  includeTestScope: false,
  verboseEnabled: true,
  fingerprintMap: new Map(),
  includePurl: false,
  ...over,
});

const digraph = (lines: string[]) => `"${ROOT}" {\n${lines.join('\n')}\n}`;

const fingerprint = (hash: string): FingerprintData => ({
  hash,
  algorithm: 'sha1',
  filePath: `/m2/${hash}.jar`,
  fileSize: 10,
  processingTime: 1,
});

// root -> a -> b -> a (cycle), root -> c -> a (second way in)
const CYCLE = digraph([
  `"${ROOT}" -> "test:a:jar:1.0.0:compile" ;`,
  `"${ROOT}" -> "test:c:jar:1.0.0:compile" ;`,
  `"test:a:jar:1.0.0:compile" -> "test:b:jar:1.0.0:compile" ;`,
  `"test:b:jar:1.0.0:compile" -> "test:a:jar:1.0.0:compile" ;`,
  `"test:c:jar:1.0.0:compile" -> "test:a:jar:1.0.0:compile" ;`,
]);

const nodeById = (json: any, nodeId: string) =>
  json.graph.nodes.find((n: any) => n.nodeId === nodeId);
const depsOf = (json: any, nodeId: string) =>
  nodeById(json, nodeId)
    .deps.map((d: any) => d.nodeId)
    .sort();

describe('buildWithVerbose', () => {
  test('draws both the plain edge and the cycle placeholder for a cycle reachable two ways', () => {
    const graph = parseDigraphs([CYCLE])[0];
    const json = buildDepGraph(graph, context()).toJSON();

    expect(json.pkgs.map((p: any) => p.id).sort()).toEqual([
      'test:a@1.0.0',
      'test:b@1.0.0',
      'test:c@1.0.0',
      'test:root@1.2.3',
    ]);
    expect(depsOf(json, 'root-node')).toEqual([
      'test:a:jar:1.0.0:compile',
      'test:c:jar:1.0.0:compile',
    ]);
    // c reaches a without closing a cycle, so the edge stays plain
    expect(depsOf(json, 'test:c:jar:1.0.0:compile')).toEqual([
      'test:a:jar:1.0.0:compile',
    ]);
    // b -> a closes the cycle and a is not reachable without b, so only the
    // placeholder is drawn
    expect(depsOf(json, 'test:b:jar:1.0.0:compile')).toEqual([
      'test:a:jar:1.0.0:compile:pruned-cycle',
    ]);
    expect(nodeById(json, 'test:a:jar:1.0.0:compile:pruned-cycle')).toEqual({
      nodeId: 'test:a:jar:1.0.0:compile:pruned-cycle',
      pkgId: 'test:a@1.0.0',
      deps: [],
      info: { labels: { pruned: 'cyclic' } },
    });
  });

  test('generates purls, including the fingerprint checksum, on the verbose path', () => {
    const graph = parseDigraphs([CYCLE])[0];
    const json = buildDepGraph(
      graph,
      context({
        includePurl: true,
        fingerprintMap: new Map([
          ['test:a:jar:1.0.0:compile', fingerprint('aaa')],
        ]),
      }),
    ).toJSON();
    const purls = Object.fromEntries(
      json.pkgs.map((p: any) => [p.id, p.info.purl]),
    );
    expect(purls).toEqual({
      'test:root@1.2.3': 'pkg:maven/test/root@1.2.3',
      'test:a@1.0.0': 'pkg:maven/test/a@1.0.0?checksum=sha1%3Aaaa',
      'test:b@1.0.0': 'pkg:maven/test/b@1.0.0',
      'test:c@1.0.0': 'pkg:maven/test/c@1.0.0',
    });
  });

  test('keeps hash and distribution labels on the package node and off the placeholder', () => {
    const graph = parseDigraphs([CYCLE])[0];
    const json = buildDepGraph(
      graph,
      context({
        hashLabelsMap: new Map<string, Record<string, string>>([
          ['test:a:jar:1.0.0:compile', { 'hash:sha1': 'aa1' }],
        ]),
        remoteRepositoriesMap: new Map<string, Record<string, string>>([
          [
            'test:a:jar:1.0.0:compile',
            { 'distribution:url': 'https://repo/a.jar' },
          ],
        ]),
      }),
    ).toJSON();

    expect(nodeById(json, 'test:a:jar:1.0.0:compile').info).toEqual({
      labels: {
        'hash:sha1': 'aa1',
        'distribution:url': 'https://repo/a.jar',
      },
    });
    // the placeholder stands for a pruned route, not a second copy of the
    // artifact, so it must not repeat its checksums
    expect(
      nodeById(json, 'test:a:jar:1.0.0:compile:pruned-cycle').info,
    ).toEqual({ labels: { pruned: 'cyclic' } });
  });

  test('labels maven build scope on the verbose path, defaulting the root to unknown', () => {
    const graph = parseDigraphs([CYCLE])[0];
    const json = buildDepGraph(
      graph,
      context({ showMavenBuildScope: true }),
    ).toJSON();
    expect(nodeById(json, 'root-node').info).toEqual({
      labels: { 'maven:build_scope': 'unknown' },
    });
    expect(nodeById(json, 'test:a:jar:1.0.0:compile').info).toEqual({
      labels: { 'maven:build_scope': 'compile' },
    });
  });

  test('keeps a test-scoped package that reaches a prod dependency, either way', () => {
    // root -> t:test -> p:compile -> t:test (cycle through a test dep)
    const graph = parseDigraphs([
      digraph([
        `"${ROOT}" -> "test:t:jar:1.0.0:test" ;`,
        `"test:t:jar:1.0.0:test" -> "test:p:jar:1.0.0:compile" ;`,
        `"test:p:jar:1.0.0:compile" -> "test:t:jar:1.0.0:test" ;`,
      ]),
    ])[0];
    for (const includeTestScope of [false, true]) {
      const json = buildDepGraph(graph, context({ includeTestScope })).toJSON();
      expect(json.pkgs.map((p: any) => p.id).sort()).toEqual([
        'test:p@1.0.0',
        'test:root@1.2.3',
        'test:t@1.0.0',
      ]);
      expect(depsOf(json, 'test:p:jar:1.0.0:compile')).toEqual([
        'test:t:jar:1.0.0:test:pruned-cycle',
      ]);
    }
  });

  test('drops a test-scoped subtree that never reaches a prod dependency', () => {
    const graph = parseDigraphs([
      digraph([
        `"${ROOT}" -> "test:a:jar:1.0.0:compile" ;`,
        `"${ROOT}" -> "test:t:jar:1.0.0:test" ;`,
        `"test:t:jar:1.0.0:test" -> "test:t2:jar:1.0.0:test" ;`,
      ]),
    ])[0];
    expect(
      buildDepGraph(graph, context({ includeTestScope: false }))
        .toJSON()
        .pkgs.map((p: any) => p.id)
        .sort(),
    ).toEqual(['test:a@1.0.0', 'test:root@1.2.3']);
    expect(
      buildDepGraph(graph, context({ includeTestScope: true }))
        .toJSON()
        .pkgs.map((p: any) => p.id)
        .sort(),
    ).toEqual([
      'test:a@1.0.0',
      'test:root@1.2.3',
      'test:t2@1.0.0',
      'test:t@1.0.0',
    ]);
  });

  test('honours mavenVerboseIncludeAllVersions for a version conflict', () => {
    const lines = [
      `"${ROOT}" -> "test:a:jar:2.0.0:compile" ;`,
      `"${ROOT}" -> "test:b:jar:1.0.0:compile" ;`,
      `"test:b:jar:1.0.0:compile" -> "(test:a:jar:1.0.0:compile - omitted for conflict with 2.0.0)" ;`,
    ];
    const resolved = parseDigraphs([digraph(lines)], {
      mavenVerboseIncludeAllVersions: false,
    })[0];
    expect(
      buildDepGraph(resolved, context())
        .toJSON()
        .pkgs.map((p: any) => p.id)
        .sort(),
    ).toEqual(['test:a@2.0.0', 'test:b@1.0.0', 'test:root@1.2.3']);

    const allVersions = parseDigraphs([digraph(lines)], {
      mavenVerboseIncludeAllVersions: true,
    })[0];
    const json = buildDepGraph(allVersions, context()).toJSON();
    expect(json.pkgs.map((p: any) => p.id).sort()).toEqual([
      'test:a@1.0.0',
      'test:a@2.0.0',
      'test:b@1.0.0',
      'test:root@1.2.3',
    ]);
    expect(depsOf(json, 'test:b:jar:1.0.0:compile')).toEqual([
      'test:a:jar:1.0.0:compile',
    ]);
  });

  test('builds an empty verbose graph when the root has no dependencies', () => {
    const graph = { rootId: ROOT, nodes: {} };
    const json = buildDepGraph(graph, context()).toJSON();
    expect(json.pkgs.map((p: any) => p.id)).toEqual(['test:root@1.2.3']);
    expect(json.graph.nodes).toEqual([
      { nodeId: 'root-node', pkgId: 'test:root@1.2.3', deps: [] },
    ]);
  });

  test('ignores a dependency id that is missing from the node map', () => {
    const graph = {
      rootId: ROOT,
      nodes: {
        [ROOT]: {
          dependsOn: ['test:a:jar:1.0.0:compile'],
          parents: [],
          reachesProdDep: true,
        },
      },
    };
    const json = buildDepGraph(graph, context()).toJSON();
    expect(depsOf(json, 'root-node')).toEqual(['test:a:jar:1.0.0:compile']);
    expect(depsOf(json, 'test:a:jar:1.0.0:compile')).toEqual([]);
  });

  test('draws only the placeholder for a package that depends on itself', () => {
    const graph = {
      rootId: ROOT,
      nodes: {
        [ROOT]: {
          dependsOn: ['test:a:jar:1.0.0:compile'],
          parents: [],
          reachesProdDep: true,
        },
        'test:a:jar:1.0.0:compile': {
          dependsOn: ['test:a:jar:1.0.0:compile'],
          parents: [ROOT, 'test:a:jar:1.0.0:compile'],
          reachesProdDep: true,
        },
      },
    };
    const json = buildDepGraph(graph, context()).toJSON();
    expect(depsOf(json, 'test:a:jar:1.0.0:compile')).toEqual([
      'test:a:jar:1.0.0:compile:pruned-cycle',
    ]);
  });

  test('keeps the root package node edges when the root depends on itself', () => {
    // `mvn dependency:tree` can name the project itself as a dependency, once
    // the version resolver rewrites a metaversion onto the project's own id.
    // The root's own edges belong to the graph root; the project's package node
    // gets only its cycle placeholder.
    const graph = {
      rootId: ROOT,
      nodes: {
        [ROOT]: {
          dependsOn: [ROOT, 'test:a:jar:1.0.0:compile'],
          parents: [ROOT],
          reachesProdDep: true,
        },
        'test:a:jar:1.0.0:compile': {
          dependsOn: [],
          parents: [ROOT],
          reachesProdDep: true,
        },
      },
    };
    const json = buildDepGraph(graph, context()).toJSON();
    expect(depsOf(json, 'root-node')).toEqual([
      'test:a:jar:1.0.0:compile',
      ROOT,
    ]);
    expect(depsOf(json, ROOT)).toEqual([`${ROOT}:pruned-cycle`]);
  });

  test('keeps the real edge back to the project when a dependency cycles to the root', () => {
    // root -> a -> root. The edge a -> root is a real dependency edge and the
    // cycle is closed on the next hop, so a must still point at the project's
    // package node and the project at a pruned placeholder for `a`.
    const graph = {
      rootId: ROOT,
      nodes: {
        [ROOT]: {
          dependsOn: ['test:a:jar:1.0.0:compile'],
          parents: ['test:a:jar:1.0.0:compile'],
          reachesProdDep: true,
        },
        'test:a:jar:1.0.0:compile': {
          dependsOn: [ROOT],
          parents: [ROOT],
          reachesProdDep: true,
        },
      },
    };
    const json = buildDepGraph(graph, context()).toJSON();
    expect(depsOf(json, 'test:a:jar:1.0.0:compile')).toEqual([ROOT]);
    expect(depsOf(json, ROOT)).toEqual([
      'test:a:jar:1.0.0:compile:pruned-cycle',
    ]);
    // every package node must be reachable from the graph root
    const referenced = new Set(
      json.graph.nodes.flatMap((n: any) => n.deps.map((d: any) => d.nodeId)),
    );
    for (const node of json.graph.nodes) {
      if (node.nodeId === 'root-node') continue;
      expect(referenced.has(node.nodeId)).toBe(true);
    }
  });
});
