import type { DepGraphData, PkgInfo } from '@snyk/dep-graph';
import { GraphNode } from '@snyk/dep-graph/dist/core/types';

type PkgData = {
  id: string;
  info: PkgInfo;
};

type NodeDep = {
  nodeId: string;
};

export function byPkgName(a: PkgInfo, b: PkgInfo): number {
  return a.name.length - b.name.length;
}

export function sortDependencyGraphDeps(graph: DepGraphData): DepGraphData {
  if (graph && graph.graph && graph.graph.nodes) {
    // Sort the top-level pkgs array by id
    if (Array.isArray(graph.pkgs)) {
      graph.pkgs.sort((a: PkgData, b: PkgData) => a.id.localeCompare(b.id));
    }
    // Sort the top-level nodes array by nodeId
    graph.graph.nodes.sort((a: GraphNode, b: GraphNode) =>
      a.nodeId.localeCompare(b.nodeId),
    );

    // Sort the deps array within each node
    graph.graph.nodes.forEach((node: any) => {
      if (node.deps && Array.isArray(node.deps)) {
        node.deps.sort((a: NodeDep, b: NodeDep) =>
          a.nodeId.localeCompare(b.nodeId),
        );
      }
    });
  }
  return graph;
}
