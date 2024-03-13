import type { MavenGraph, MavenGraphNode } from './types';
import { DepGraph, DepGraphBuilder, PkgInfo } from '@snyk/dep-graph';
import {parseDependency, parseOmittedVersion} from './dependency';

export function buildDepGraph(
  mavenGraph: MavenGraph,
  includeTestScope = false,
  verboseOutput = false,
): DepGraph {
  const { rootId, nodes } = mavenGraph;
  const parsedRoot = parseId(rootId, verboseOutput);
  const builder = new DepGraphBuilder({ name: 'maven' }, parsedRoot.pkgInfo);
  const visitedMap: Record<string, DepInfo> = {};
  const queue: QueueItem[] = [];
  queue.push(...getItems(rootId, nodes[rootId]));

  // breadth first search
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) continue;
    const { id, parentId } = item;
    const parsed = parseId(id, verboseOutput);
    const node = nodes[id];
    if (!includeTestScope && parsed.scope === 'test' && !node.reachesProdDep && !verboseOutput)
      continue;
    const visited = visitedMap[parsed.key];
    if (visited && !verboseOutput) {
      const prunedId = visited.id + ':pruned';
      builder.addPkgNode(visited.pkgInfo, prunedId, {
        labels: { pruned: 'true' },
      });
      builder.connectDep(parentId, prunedId);
      continue; // don't queue any more children
    }
    const parentNodeId = parentId === rootId ? builder.rootNodeId : parentId;
    builder.addPkgNode(parsed.pkgInfo, id);
    builder.connectDep(parentNodeId, id);
    queue.push(...getItems(id, node));
    visitedMap[parsed.key] = parsed;
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

interface DepInfo {
  id: string; // maven graph id
  key: string; // maven dependency groupId:artifactId:type:classifier
  pkgInfo: PkgInfo; // dep-graph name and version
  scope?: string; // maybe scope
}

function parseId(id: string, verbose = false): DepInfo {
  const dep = verbose ? parseOmittedVersion(id) : parseDependency(id);
  const maybeClassifier = dep.classifier ? `:${dep.classifier}` : '';
  const name = `${dep.groupId}:${dep.artifactId}`;
  return {
    id,
    key: `${name}:${dep.type}${maybeClassifier}`,
    pkgInfo: {
      name,
      version: dep.version,
    },
    scope: dep.scope,
  };
}
