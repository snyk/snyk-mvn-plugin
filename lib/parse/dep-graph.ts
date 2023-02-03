import type { MavenGraph, MavenGraphNode } from './types';

import { DepGraph, DepGraphBuilder, PkgInfo } from '@snyk/dep-graph';
import { parseDependency } from './dependency';

export function buildDepGraph(
  mavenGraph: MavenGraph,
  includeTestScope = false,
): DepGraph {
  const { rootId, nodes } = mavenGraph;
  const { pkgInfo: root } = getPkgInfo(rootId);
  const builder = new DepGraphBuilder({ name: 'maven' }, root);
  const visited: string[] = [];
  const queue: QueueItem[] = [];
  queue.push(...getItems(rootId, nodes[rootId]));

  // breadth first search
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    const { id, parentId } = item;
    const { pkgInfo, scope } = getPkgInfo(id);
    if (!includeTestScope && scope === 'test') continue;
    if (visited.includes(id)) {
      const prunedId = id + ':pruned';
      builder.addPkgNode(pkgInfo, prunedId, { labels: { pruned: 'true' } });
      builder.connectDep(parentId, prunedId);
      continue; // don't queue any more children
    }
    const parentNodeId = parentId === rootId ? builder.rootNodeId : parentId;
    builder.addPkgNode(pkgInfo, id);
    builder.connectDep(parentNodeId, id);
    queue.push(...getItems(id, nodes[id]));
    visited.push(id);
  }

  return builder.build();
}

interface QueueItem {
  id: string;
  parentId: string;
}

function getItems(parentId: string, node?: MavenGraphNode): QueueItem[] {
  const items: QueueItem[] = [];
  for (const id of node?.dependsOn || []) {
    items.push({ id, parentId });
  }
  return items;
}

function getPkgInfo(value: string): { pkgInfo: PkgInfo; scope?: string } {
  const { groupId, artifactId, version, scope } = parseDependency(value);
  return {
    pkgInfo: {
      name: `${groupId}:${artifactId}`,
      version,
    },
    scope,
  };
}
