import type { MavenGraph, MavenGraphNode, FingerprintData } from './types';

import Queue from '@common.js/yocto-queue';
import { DepGraph, DepGraphBuilder, PkgInfo } from '@snyk/dep-graph';
import { parseDependency } from './dependency';
import { createFingerprintLabels } from '../fingerprint';

export function buildDepGraph(
  mavenGraph: MavenGraph,
  includeTestScope = false,
  verboseEnabled = false,
  fingerprintMap = new Map<string, FingerprintData>(),
): DepGraph {
  const { rootId, nodes } = mavenGraph;

  return verboseEnabled
    ? buildWithVerbose(rootId, nodes, includeTestScope, fingerprintMap)
    : buildWithoutVerbose(rootId, nodes, includeTestScope, fingerprintMap);
}

export function buildWithoutVerbose(
  rootId: string,
  nodes: Record<string, MavenGraphNode>,
  includeTestScope = false,
  fingerprintMap = new Map<string, FingerprintData>(),
): DepGraph {
  const parsedRoot = parseId(rootId);
  const builder = new DepGraphBuilder({ name: 'maven' }, parsedRoot.pkgInfo);
  const visitedMap: Record<string, DepInfo> = {};
  const queue = new Queue<QueueItem>();
  getItems(rootId, nodes[rootId]).forEach((item) => queue.enqueue(item));

  // breadth first search
  while (queue.size > 0) {
    const item = queue.dequeue();

    if (!item) continue;
    const { id, parentId } = item;
    const parsed = parseId(id);
    const node = nodes[id];
    if (!includeTestScope && parsed.scope === 'test' && !node.reachesProdDep) {
      continue;
    }
    const visited = visitedMap[parsed.key];
    if (visited) {
      const prunedId = visited.id + ':pruned';
      builder.addPkgNode(visited.pkgInfo, prunedId, {
        labels: { pruned: 'true' },
      });
      builder.connectDep(parentId, prunedId);
      continue; // don't queue any more children
    }

    const parentNodeId = parentId === rootId ? builder.rootNodeId : parentId;

    // Check for fingerprint data
    const fingerprintData = fingerprintMap.get(id);
    const labels = fingerprintData ? createFingerprintLabels(fingerprintData) : undefined;

    builder.addPkgNode(parsed.pkgInfo, id, labels ? { labels } : undefined);
    builder.connectDep(parentNodeId, id);
    visitedMap[parsed.key] = parsed;
    getItems(id, node).forEach((item) => queue.enqueue(item));
  }

  return builder.build();
}

export function buildWithVerbose(
  rootId: string,
  nodes: Record<string, MavenGraphNode>,
  includeTestScope = false,
  fingerprintMap = new Map<string, FingerprintData>(),
): DepGraph {
  const parsedRoot = parseId(rootId);
  const builder = new DepGraphBuilder({ name: 'maven' }, parsedRoot.pkgInfo);
  const visitedMap: Record<string, DepInfo> = {};
  const stack: StackItemVerbose[] = [];
  stack.push(...getVerboseItems(rootId, [], nodes[rootId]));

  // depth first search
  while (stack.length > 0) {
    const item = stack.pop();

    if (!item) continue;
    const { id, ancestry, parentId } = item;
    const parsed = parseId(id, true);
    const node = nodes[id];
    if (!includeTestScope && parsed.scope === 'test' && !node.reachesProdDep) {
      continue;
    }
    const visited = visitedMap[parsed.key];

    // If verbose is enabled and our ancestry includes ourselves
    // we are cyclic and should be pruned :)
    if (ancestry.includes(parsed.key)) {
      const prunedId = visited.id + ':pruned-cycle';
      builder.addPkgNode(visited.pkgInfo, prunedId, {
        labels: { pruned: 'cyclic' },
      });
      builder.connectDep(parentId, prunedId);
      continue; // don't queue any more children
    }

    const parentNodeId = parentId === rootId ? builder.rootNodeId : parentId;
    if (visited) {
      builder.connectDep(parentNodeId, visited.id);

      // use visited node when omited dependencies found (verbose)
      stack.push(
        ...getVerboseItems(visited.id, [...ancestry, parsed.key], node),
      );
    } else {
      // Check for fingerprint data for new nodes
      const fingerprintData = fingerprintMap.get(id);
      const labels = fingerprintData ? createFingerprintLabels(fingerprintData) : undefined;

      builder.addPkgNode(parsed.pkgInfo, id, labels ? { labels } : undefined);
      builder.connectDep(parentNodeId, id);
      visitedMap[parsed.key] = parsed;
      // Remember to push updated ancestry here
      stack.push(...getVerboseItems(id, [...ancestry, parsed.key], node));
    }
  }

  return builder.build();
}

interface QueueItem {
  id: string;
  parentId: string;
}

interface StackItemVerbose extends QueueItem {
  ancestry: string[]; // This is an easy trick to maintain ancestry at cost of space for the verbose algorithm
}

function getItems(parentId: string, node?: MavenGraphNode): QueueItem[] {
  const items: QueueItem[] = [];
  for (const id of node?.dependsOn || []) {
    items.push({ id, parentId });
  }
  return items;
}

function getVerboseItems(
  parentId: string,
  ancestry: string[],
  node?: MavenGraphNode,
): StackItemVerbose[] {
  const items: StackItemVerbose[] = [];
  for (const id of node?.dependsOn || []) {
    items.push({ id, ancestry, parentId });
  }
  return items;
}

interface DepInfo {
  id: string; // maven graph id
  key: string; // maven dependency groupId:artifactId:type:classifier
  pkgInfo: PkgInfo; // dep-graph name and version
  scope?: string; // maybe scope
}

function parseId(id: string, verboseEnabled = false): DepInfo {
  const dep = parseDependency(id);
  const maybeClassifier = dep.classifier ? `:${dep.classifier}` : '';
  const name = `${dep.groupId}:${dep.artifactId}`;
  return {
    id,
    key: verboseEnabled
      ? `${name}:${dep.type}${maybeClassifier}:${dep.version}:${dep.scope}`
      : `${name}:${dep.type}${maybeClassifier}`,
    pkgInfo: {
      name,
      version: dep.version,
    },
    scope: dep.scope,
  };
}
