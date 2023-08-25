import type { MavenGraph, MavenGraphNode } from './types';

export class MavenGraphBuilder {
  readonly #graph: MavenGraph;

  constructor(rootId: string) {
    this.#graph = {
      rootId,
      nodes: {
        [rootId]: { dependsOn: [], parents: [], reachesProdDep: false },
      },
    };
  }

  private findOrCreateNode(id: string): MavenGraphNode {
    return this.findNode(id) || this.createNode(id);
  }

  private findNode(id: string): MavenGraphNode | undefined {
    return this.#graph.nodes[id];
  }

  private createNode(id: string): MavenGraphNode {
    const node = { dependsOn: [], parents: [], reachesProdDep: false };
    this.#graph.nodes[id] = node;
    return node;
  }

  private markNodeProdReachable(id: string) {
    const node = this.findNode(id);
    if (node && !node.reachesProdDep) {
      node.reachesProdDep = true;
      for (const parentId of node.parents) {
        this.markNodeProdReachable(parentId);
      }
    }
  }

  connect(parentId: string, id: string) {
    const parentNode = this.findOrCreateNode(parentId);
    const childNode = this.findOrCreateNode(id);
    if (!childNode.parents.includes(parentId)) {
      childNode.parents.push(parentId);
    }
    if (!parentNode.dependsOn.includes(id)) {
      parentNode.dependsOn.push(id);
    }
    if (!id.endsWith(':test')) {
      this.markNodeProdReachable(id);
    }
  }

  get graph(): MavenGraph {
    return this.#graph;
  }
}
