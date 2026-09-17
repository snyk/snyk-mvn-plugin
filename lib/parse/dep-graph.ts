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

const MAVEN_BUILD_SCOPE_UNKNOWN = 'unknown';

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
  const builder = new DepGraphBuilder(
    { name: 'maven' },
    parsedRoot.pkgInfo,
    createNodeInfo(parsedRoot, context, MAVEN_BUILD_SCOPE_UNKNOWN),
  );
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

// Today's verbose graph is defined per path: whether an edge is drawn to a
// package or to a `:pruned-cycle` placeholder depends on the ancestry of the
// route taken to reach it, so the same edge can legitimately produce both. The
// old walker discovered that by enumerating every path, which is O(paths) and
// takes minutes to hours on a reactor where packages are reachable many ways.
//
// The same answer follows from two graph properties, without enumeration:
//
//   * an edge `u -> v` closes a cycle exactly when `v` can reach `u`, i.e. the
//     two share a strongly connected component;
//   * the plain edge `u -> v` is drawn as well exactly when some route to `u`
//     avoids `v`, i.e. `u` is still reachable from the root once `v` is removed.
//
// So each edge is decided once. The second property only has to be computed for
// packages that take part in a cycle, which is a handful even on large graphs.
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
  const builder = new DepGraphBuilder(
    { name: 'maven' },
    parsedRoot.pkgInfo,
    createNodeInfo(parsedRoot, context, MAVEN_BUILD_SCOPE_UNKNOWN),
  );

  const parsedCache = new Map<string, DepInfo>();
  const parsed = (id: string): DepInfo => {
    let depInfo = parsedCache.get(id);
    if (!depInfo) {
      depInfo = parseId(id, true, includePurl, fingerprintMap.get(id));
      parsedCache.set(id, depInfo);
    }
    return depInfo;
  };

  // A test-scoped package that never reaches a production dependency is
  // dropped wherever it appears, so inclusion is a property of the package
  // rather than of the route to it.
  const isIncluded = (id: string): boolean =>
    includeTestScope ||
    parsed(id).scope !== 'test' ||
    !!nodes[id]?.reachesProdDep;

  const childrenOf = (id: string): string[] =>
    (nodes[id]?.dependsOn || []).filter(isIncluded);

  const reachableFromRoot = (without?: string): Set<string> => {
    const reached = new Set<string>();
    const stack = childrenOf(rootId).filter((id) => id !== without);
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (reached.has(id)) continue;
      reached.add(id);
      for (const child of childrenOf(id)) {
        if (child !== without && !reached.has(child)) stack.push(child);
      }
    }
    return reached;
  };

  const reachable = reachableFromRoot();
  const componentOf = findStronglyConnectedComponents(reachable, childrenOf);

  const reachableWithout = new Map<string, Set<string>>();
  const reachedWithout = (without: string): Set<string> => {
    let reached = reachableWithout.get(without);
    if (!reached) {
      reached = reachableFromRoot(without);
      reachableWithout.set(without, reached);
    }
    return reached;
  };

  // `to` has to be able to reach `from` for the edge to sit on a cycle, and
  // `to` has to be reachable without `from` for it to be able to come first on
  // any route - otherwise `to` can only ever be seen after `from` and the edge
  // is an ordinary one.
  const closesCycle = (from: string, to: string): boolean =>
    from === to ||
    (componentOf.get(from) === componentOf.get(to) &&
      reachedWithout(from).has(to));

  const routeAvoiding = (from: string, to: string): boolean =>
    reachedWithout(to).has(from);

  // Every reachable package is added once: the first route to reach it cannot
  // already contain it, so it always gets a package node of its own.
  for (const id of reachable) {
    const depInfo = parsed(id);
    builder.addPkgNode(depInfo.pkgInfo, id, createNodeInfo(depInfo, context));
  }

  const prunedAdded = new Set<string>();
  const prunedCycleNodeFor = (id: string): string => {
    const prunedId = id + ':pruned-cycle';
    if (!prunedAdded.has(prunedId)) {
      builder.addPkgNode(parsed(id).pkgInfo, prunedId, {
        labels: { pruned: 'cyclic' },
      });
      prunedAdded.add(prunedId);
    }
    return prunedId;
  };

  // The root is never its own ancestor, so its own edges are always plain.
  for (const child of childrenOf(rootId)) {
    builder.connectDep(builder.rootNodeId, child);
  }

  for (const from of reachable) {
    for (const to of childrenOf(from)) {
      if (closesCycle(from, to)) {
        builder.connectDep(from, prunedCycleNodeFor(to));
        if (!routeAvoiding(from, to)) continue;
      }
      builder.connectDep(from, to);
    }
  }

  return builder.build();
}

// Tarjan's algorithm, driven by an explicit stack: a recursive implementation
// overflows the call stack on the deep dependency chains this is here to cope
// with in the first place.
function findStronglyConnectedComponents(
  nodeIds: Iterable<string>,
  childrenOf: (id: string) => string[],
): Map<string, number> {
  const index = new Map<string, number>();
  const lowLink = new Map<string, number>();
  const onStack = new Set<string>();
  const pending: string[] = [];
  const componentOf = new Map<string, number>();
  let nextIndex = 0;
  let nextComponent = 0;

  const open = (id: string): void => {
    index.set(id, nextIndex);
    lowLink.set(id, nextIndex);
    nextIndex++;
    pending.push(id);
    onStack.add(id);
  };

  for (const start of nodeIds) {
    if (index.has(start)) continue;
    open(start);
    const work = [{ id: start, children: childrenOf(start), next: 0 }];

    while (work.length > 0) {
      const frame = work[work.length - 1];
      if (frame.next < frame.children.length) {
        const child = frame.children[frame.next++];
        if (!index.has(child)) {
          open(child);
          work.push({ id: child, children: childrenOf(child), next: 0 });
        } else if (onStack.has(child)) {
          lowLink.set(
            frame.id,
            Math.min(
              lowLink.get(frame.id) as number,
              index.get(child) as number,
            ),
          );
        }
        continue;
      }

      work.pop();
      if (work.length > 0) {
        const caller = work[work.length - 1];
        lowLink.set(
          caller.id,
          Math.min(
            lowLink.get(caller.id) as number,
            lowLink.get(frame.id) as number,
          ),
        );
      }
      if (lowLink.get(frame.id) === index.get(frame.id)) {
        const component = nextComponent++;
        let member: string;
        do {
          member = pending.pop() as string;
          onStack.delete(member);
          componentOf.set(member, component);
        } while (member !== frame.id);
      }
    }
  }

  return componentOf;
}

function createNodeInfo(
  depInfo: DepInfo,
  context: ParseContext,
  defaultScope = 'compile',
): NodeInfo | undefined {
  const labels: Record<string, string> = {};

  if (context.showMavenBuildScope) {
    labels['maven:build_scope'] = depInfo.scope ? depInfo.scope : defaultScope;
  }

  // Merge install-time-recorded hash labels (read from `.m2/.../*.sha1` etc.
  // companion files). These are consumed downstream to populate CycloneDX
  // `component.Hashes` / SPDX `Package.PackageChecksums`.
  const hashLabels = context.hashLabelsMap?.get(depInfo.id);
  if (hashLabels) {
    Object.assign(labels, hashLabels);
  }

  // Merge distribution-source labels (read from `.m2/.../repository/*/_remote.repositories`
  // and resolved to full artifact URLs via Maven's dependency:list-repositories).
  // These are consumed downstream to populate CycloneDX `component.ExternalReferences`
  // with type="distribution".
  const repoLabels = context.remoteRepositoriesMap?.get(depInfo.id);
  if (repoLabels) {
    Object.assign(labels, repoLabels);
  }

  if (Object.keys(labels).length === 0) {
    return;
  }
  return { labels };
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
