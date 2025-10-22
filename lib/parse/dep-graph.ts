import type {
  FingerprintData,
  MavenGraph,
  MavenGraphNode,
  ParseContext,
} from './types';

import Queue from '@common.js/yocto-queue';
import { DepGraph, DepGraphBuilder, PkgInfo } from '@snyk/dep-graph';
import type { NodeInfo } from '@snyk/dep-graph/dist/core/types';
import { parseDependency } from './dependency';
import { createMavenPurlWithChecksum } from '../fingerprint';

export function buildDepGraph(
  mavenGraph: MavenGraph,
  context: ParseContext,
): DepGraph {
  const { rootId, nodes } = mavenGraph;

  return context.verboseEnabled
    ? buildWithVerbose(rootId, nodes, context)
    : buildWithoutVerbose(rootId, nodes, context);
}

export function buildWithoutVerbose(
  rootId: string,
  nodes: Record<string, MavenGraphNode>,
  context: ParseContext,
): DepGraph {
  const { fingerprintMap, includePurl, includeTestScope } = context;
  const parsedRoot = parseId(
    rootId,
    true,
    includePurl,
    fingerprintMap.get(rootId),
  );
  const builder = new DepGraphBuilder({ name: 'maven' }, parsedRoot.pkgInfo);
  const visitedMap: Record<string, DepInfo> = {};
  const queue = new Queue<QueueItem>();
  getItems(rootId, nodes[rootId]).forEach((item) => queue.enqueue(item));

  // breadth first search
  while (queue.size > 0) {
    const item = queue.dequeue();

    if (!item) continue;
    const { id, parentId } = item;
    const parsed = parseId(id, false, includePurl, fingerprintMap.get(id));
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

    builder.addPkgNode(parsed.pkgInfo, id, createNodeInfo(parsed, context));
    builder.connectDep(parentNodeId, id);
    visitedMap[parsed.key] = parsed;
    getItems(id, node).forEach((item) => queue.enqueue(item));
  }

  return builder.build();
}

export function buildWithVerbose(
  rootId: string,
  nodes: Record<string, MavenGraphNode>,
  context: ParseContext,
): DepGraph {
  const { fingerprintMap, includePurl, includeTestScope } = context;
  const parsedRoot = parseId(
    rootId,
    true,
    includePurl,
    fingerprintMap.get(rootId),
  );
  const builder = new DepGraphBuilder({ name: 'maven' }, parsedRoot.pkgInfo);
  const visitedMap: Record<string, DepInfo> = {};
  const stack: StackItemVerbose[] = [];
  stack.push(...getVerboseItems(rootId, [], nodes[rootId]));

  // depth first search
  while (stack.length > 0) {
    const item = stack.pop();

    if (!item) continue;
    const { id, ancestry, parentId } = item;
    const parsed = parseId(id, true, includePurl, fingerprintMap.get(id));
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
      builder.addPkgNode(parsed.pkgInfo, id, createNodeInfo(parsed, context));
      builder.connectDep(parentNodeId, id);
      visitedMap[parsed.key] = parsed;
      // Remember to push updated ancestry here
      stack.push(...getVerboseItems(id, [...ancestry, parsed.key], node));
    }
  }

  return builder.build();
}

function createNodeInfo(depInfo: DepInfo, context: ParseContext): NodeInfo | undefined {
  if (context.sbomMavenScopeProperties) {
    return {
      labels: { 'snyk:build:scope': `maven:${depInfo.scope ? depInfo.scope : 'compile'}` },
    };
  }
  return;
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

function parseId(
  id: string,
  verboseEnabled = false,
  includePurl = false,
  fingerprintData?: FingerprintData,
): DepInfo {
  const dep = parseDependency(id);
  const maybeClassifier = dep.classifier ? `:${dep.classifier}` : '';
  const name = `${dep.groupId}:${dep.artifactId}`;

  // Only do expensive operations if PURL is needed
  let purl: string | undefined;
  if (includePurl) {
    purl = createMavenPurlWithChecksum(
      dep.groupId,
      dep.artifactId,
      dep.version,
      fingerprintData,
      dep.classifier,
      dep.type,
    );
  }

  return {
    id,
    key: verboseEnabled
      ? `${name}:${dep.type}${maybeClassifier}:${dep.version}:${dep.scope}`
      : `${name}:${dep.type}${maybeClassifier}`,
    pkgInfo: {
      name,
      version: dep.version,
      ...(includePurl ? { purl } : {}),
    },
    scope: dep.scope,
  };
}
