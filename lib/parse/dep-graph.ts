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
// So each edge is decided once, off one strongly-connected-components pass and
// a dominator tree per cycle.
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

  const parsed = createDepInfoLookup(fingerprintMap, includePurl);

  // A test-scoped package that never reaches a production dependency is
  // dropped wherever it appears, so inclusion is a property of the package
  // rather than of the route to it.
  const isIncluded = (id: string): boolean =>
    includeTestScope ||
    parsed(id).scope !== 'test' ||
    !!nodes[id]?.reachesProdDep;

  const childrenOf = (id: string): string[] =>
    (nodes[id]?.dependsOn || []).filter(isIncluded);

  const reachableFromRoot = (): Set<string> => {
    const reached = new Set<string>();
    const stack = childrenOf(rootId);
    while (stack.length > 0) {
      const id = stack.pop() as string;
      if (reached.has(id)) continue;
      reached.add(id);
      for (const child of childrenOf(id)) {
        if (!reached.has(child)) stack.push(child);
      }
    }
    return reached;
  };

  const reachable = reachableFromRoot();
  const componentOf = findStronglyConnectedComponents(reachable, childrenOf);
  const dominates = buildCycleDominanceTest(
    childrenOf(rootId),
    reachable,
    childrenOf,
    componentOf,
  );

  // `to` has to be able to reach `from` for the edge to sit on a cycle, and
  // `to` has to be reachable without `from` for it to be able to come first on
  // any route - otherwise `to` can only ever be seen after `from` and the edge
  // is an ordinary one. Both conditions are necessary but not jointly
  // sufficient: deciding it exactly asks whether a route to `from` passes
  // through `to`, which needs the two halves to be vertex-disjoint and is the
  // NP-hard two-disjoint-paths problem. So this is a deliberate
  // over-approximation - it can mark an extra edge as cyclic, and never drops
  // a package or a real dependency edge.
  const closesCycle = (from: string, to: string): boolean =>
    from === to ||
    (componentOf.get(from) === componentOf.get(to) && !dominates(from, to));

  // Whether some route from the root reaches `from` without passing through
  // `to`: if one does, `from -> to` can be walked with `to` not yet an
  // ancestor, so the plain edge is drawn alongside the cycle placeholder. A
  // self-loop never can, and its package sits in no dominator tree to say so.
  const canReachSourceWithoutTarget = (from: string, to: string): boolean =>
    from !== to && !dominates(to, from);

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
    // matches the old walk, which mapped a parent equal to the root id onto the
    // builder's own root node
    const fromNodeId = from === rootId ? builder.rootNodeId : from;
    for (const to of childrenOf(from)) {
      if (closesCycle(from, to)) {
        // the old walk connected placeholders from the raw parent and only
        // mapped the root for plain edges, so this stays asymmetric on purpose
        builder.connectDep(from, prunedCycleNodeFor(to));
        if (!canReachSourceWithoutTarget(from, to)) continue;
      }
      builder.connectDep(fromNodeId, to);
    }
  }

  return builder.build();
}

// Dominance is only ever asked about two packages in the same strongly
// connected component, and a route from the root that enters a component
// cannot leave it and come back. So whether one member dominates another
// depends only on the component itself and on where routes enter it, and each
// cyclic component gets a dominator tree of its own. Packages outside any
// cycle - the bulk of a real dependency graph - cost nothing here.
//
// Keeping the trees small matters because Cooper, Harvey and Kennedy's
// algorithm is quadratic in the worst case: a single tree over a long chain
// whose every link also depends on one shared library climbs ever-longer
// dominator chains, and took seconds at a few thousand packages.
function buildCycleDominanceTest(
  rootChildren: string[],
  packages: Set<string>,
  childrenOf: (id: string) => string[],
  componentOf: Map<string, number>,
): (dominator: string, id: string) => boolean {
  const componentSizes = new Map<number, number>();
  for (const component of componentOf.values()) {
    componentSizes.set(component, (componentSizes.get(component) || 0) + 1);
  }
  const isCyclic = (component: number | undefined): boolean =>
    component !== undefined && (componentSizes.get(component) as number) > 1;

  const entriesByComponent = new Map<number, string[]>();
  const addEntry = (id: string): void => {
    const component = componentOf.get(id) as number;
    if (!isCyclic(component)) return;
    const entries = entriesByComponent.get(component);
    if (entries) entries.push(id);
    else entriesByComponent.set(component, [id]);
  };

  // The root's own edges are where every route starts, so its children are
  // entries even when something points back at the root and puts it in a
  // component of its own; any other member is an entry when an edge reaches
  // it from outside its component.
  rootChildren.forEach(addEntry);
  for (const from of packages) {
    for (const to of childrenOf(from)) {
      if (componentOf.get(from) !== componentOf.get(to)) addEntry(to);
    }
  }

  const dominanceByComponent = new Map<
    number,
    (dominator: string, id: string) => boolean
  >();
  for (const [component, entries] of entriesByComponent) {
    const membersOnly = (id: string): string[] =>
      childrenOf(id).filter((child) => componentOf.get(child) === component);
    dominanceByComponent.set(
      component,
      buildDominanceTest(entries, membersOnly),
    );
  }

  return (dominator, id) => {
    const test = dominanceByComponent.get(componentOf.get(id) as number);
    return test ? test(dominator, id) : false;
  };
}

// A node id the graph cannot contain, so the dominator tree can have an entry
// of its own that leads to every place routes come in from outside.
const DOMINANCE_ENTRY = '\u0000dominance-entry';

// `to` is reachable from the entries without `from` exactly when `from` does
// not dominate `to`, so one dominator tree answers every such question in
// constant time.
function buildDominanceTest(
  entries: string[],
  successorsOf: (id: string) => string[],
): (dominator: string, id: string) => boolean {
  const graph = prepareDominanceGraph(DOMINANCE_ENTRY, (id) =>
    id === DOMINANCE_ENTRY ? entries : successorsOf(id),
  );
  const immediateDominator = computeImmediateDominators(DOMINANCE_ENTRY, graph);
  return createDominanceLookup(DOMINANCE_ENTRY, immediateDominator);
}

interface DominanceGraph {
  // reverse postorder, so every node follows its predecessors wherever the
  // graph is acyclic
  order: string[];
  rank: Map<string, number>;
  predecessors: Map<string, string[]>;
}

function prepareDominanceGraph(
  entry: string,
  successorsOf: (id: string) => string[],
): DominanceGraph {
  // A node is recorded in postorder by its leaving frame, which is pushed
  // beneath its children so that it pops once they have all been walked.
  const postorder: string[] = [];
  const seen = new Set<string>();
  const stack: { id: string; leaving?: true }[] = [{ id: entry }];
  while (stack.length > 0) {
    const { id, leaving } = stack.pop() as { id: string; leaving?: true };
    if (leaving) {
      postorder.push(id);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push({ id, leaving: true });
    const successors = successorsOf(id);
    for (let i = successors.length - 1; i >= 0; i--) {
      if (!seen.has(successors[i])) stack.push({ id: successors[i] });
    }
  }

  const order = postorder.reverse();
  const rank = new Map<string, number>();
  order.forEach((id, position) => rank.set(id, position));

  const predecessors = new Map<string, string[]>();
  for (const id of order) {
    for (const successor of successorsOf(id)) {
      const known = predecessors.get(successor);
      if (known) known.push(id);
      else predecessors.set(successor, [id]);
    }
  }
  return { order, rank, predecessors };
}

// Cooper, Harvey and Kennedy's iterative formulation: refine each node's
// immediate dominator from its predecessors' until nothing changes.
function computeImmediateDominators(
  entry: string,
  { order, rank, predecessors }: DominanceGraph,
): Map<string, string> {
  const immediateDominator = new Map<string, string>([[entry, entry]]);

  // Walks both nodes up the dominator tree built so far until they meet.
  const nearestCommonDominator = (left: string, right: string): string => {
    let a = left;
    let b = right;
    while (a !== b) {
      while ((rank.get(a) as number) > (rank.get(b) as number))
        a = immediateDominator.get(a) as string;
      while ((rank.get(b) as number) > (rank.get(a) as number))
        b = immediateDominator.get(b) as string;
    }
    return a;
  };

  let settled = false;
  while (!settled) {
    settled = true;
    for (const id of order) {
      if (id === entry) continue;
      let candidate: string | undefined;
      for (const predecessor of predecessors.get(id) || []) {
        if (!immediateDominator.has(predecessor)) continue;
        candidate =
          candidate === undefined
            ? predecessor
            : nearestCommonDominator(predecessor, candidate);
      }
      if (candidate !== undefined && immediateDominator.get(id) !== candidate) {
        immediateDominator.set(id, candidate);
        settled = false;
      }
    }
  }
  return immediateDominator;
}

// Entry and exit stamps over the dominator tree turn dominance into a range
// check: one node dominates another when its interval encloses it.
function createDominanceLookup(
  entry: string,
  immediateDominator: Map<string, string>,
): (dominator: string, id: string) => boolean {
  const treeChildren = new Map<string, string[]>();
  for (const [id, parent] of immediateDominator) {
    if (id === entry) continue;
    const known = treeChildren.get(parent);
    if (known) known.push(id);
    else treeChildren.set(parent, [id]);
  }

  const entered = new Map<string, number>();
  const exited = new Map<string, number>();
  let clock = 0;
  const stack: { id: string; leaving?: true }[] = [{ id: entry }];
  while (stack.length > 0) {
    const { id, leaving } = stack.pop() as { id: string; leaving?: true };
    if (leaving) {
      exited.set(id, clock++);
      continue;
    }
    entered.set(id, clock++);
    stack.push({ id, leaving: true });
    for (const child of treeChildren.get(id) || []) stack.push({ id: child });
  }

  return (dominator, id) => {
    const from = entered.get(dominator);
    const to = entered.get(id);
    if (from === undefined || to === undefined) return false;
    return (
      from <= to &&
      (exited.get(id) as number) <= (exited.get(dominator) as number)
    );
  };
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

// Parsing an id, and building its purl, is repeated for every edge that
// touches it, so each id is parsed once.
function createDepInfoLookup(
  fingerprintMap: Map<string, FingerprintData>,
  includePurl: boolean,
): (id: string) => DepInfo {
  const cache = new Map<string, DepInfo>();
  return (id) => {
    let depInfo = cache.get(id);
    if (!depInfo) {
      depInfo = parseId(id, true, includePurl, fingerprintMap.get(id));
      cache.set(id, depInfo);
    }
    return depInfo;
  };
}
