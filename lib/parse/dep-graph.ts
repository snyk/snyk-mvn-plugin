import type { MavenGraph, MavenGraphNode } from './types';

import { DepGraph, DepGraphBuilder, PkgInfo } from '@snyk/dep-graph';
import { parseDependency } from './dependency';

const TEST_SCOPE = 'test';
const COMPILE_SCOPE = 'compile';
const RUNTIME_SCOPE = 'runtime';

export function buildDepGraph(
  mavenGraph: MavenGraph,
  includeTestScope = false,
): DepGraph {
  const { rootId, nodes } = mavenGraph;
  const { pkgInfo: root } = getPkgInfo(rootId);
  const builder = new DepGraphBuilder({ name: 'maven' }, root);
  const visited: Record<string, boolean> = {};
  const queue: QueueItem[] = [];
  const checkedTestScopes: Set<string> = new Set();
  const positiveTestScopes: Set<string> = new Set();
  const inProgress: Set<string> = new Set();
  queue.push(...getItems(rootId, nodes[rootId]));

  // breadth first search
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    const { id, parentId } = item;
    const { pkgInfo, scope } = getPkgInfo(id);

    if (scope === TEST_SCOPE && !includeTestScope) {
      const wasChecked = checkedTestScopes.has(id);

      if (!wasChecked) {
        if (
          peekThroughBranchRecursive(
            id,
            nodes,
            checkedTestScopes,
            positiveTestScopes,
            inProgress,
          )
        ) {
          positiveTestScopes.add(id);
        }
        checkedTestScopes.add(id);
      }

      if (!positiveTestScopes.has(id)) {
        continue;
      }
      // At this point it's a positive, so it would be added to the dep graph.
    }

    if (visited[id]) {
      const prunedId = id + ':pruned';
      builder.addPkgNode(pkgInfo, prunedId, { labels: { pruned: 'true' } });
      builder.connectDep(parentId, prunedId);
      continue; // don't queue any more children
    }
    const parentNodeId = parentId === rootId ? builder.rootNodeId : parentId;
    builder.addPkgNode(pkgInfo, id);
    builder.connectDep(parentNodeId, id);
    queue.push(...getItems(id, nodes[id]));
    visited[id] = true;
  }

  return builder.build();
}

/**
 * Peeks through the branch in search for a compile transitive under a test dep.
 */
const peekThroughBranchRecursive = (
  id: string,
  nodes: Record<string, MavenGraphNode>,
  checkedTestScopes: Set<string>,
  positiveTestScopes: Set<string>,
  inProgress: Set<string>,
) => {
  if (checkedTestScopes.has(id) || inProgress.has(id)) {
    return positiveTestScopes.has(id);
  }
  inProgress.add(id);

  const { scope } = getPkgInfo(id);
  const items = getItems(id, nodes[id]);

  if (items?.length === 0) {
    if (scope === COMPILE_SCOPE || scope === RUNTIME_SCOPE) {
      inProgress.delete(id);
      return true;
    }
    checkedTestScopes.add(id);
    inProgress.delete(id);
    return false;
  }

  let isPositive = false;
  for (const item of items) {
    if (
      peekThroughBranchRecursive(
        item.id,
        nodes,
        checkedTestScopes,
        positiveTestScopes,
        inProgress,
      )
    ) {
      isPositive = true;
    }
  }

  if (isPositive && scope === TEST_SCOPE) {
    checkedTestScopes.add(id);
    positiveTestScopes.add(id);
  }

  if (scope === COMPILE_SCOPE || scope === RUNTIME_SCOPE) {
    inProgress.delete(id);
    return true;
  }

  checkedTestScopes.add(id);
  inProgress.delete(id);
  return false;
};

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
