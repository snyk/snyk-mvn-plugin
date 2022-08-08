import type { MavenGraph, MavenGraphNode } from './types';

export class MavenGraphBuilder {
  readonly #graph: MavenGraph;

  constructor(rootId: string) {
    this.#graph = {
      rootId,
      nodes: {
        [rootId]: { dependsOn: [] },
      },
    };
  }

  private add(id: string): void {
    if (!this.node(id)) {
      this.#graph.nodes[id] = { dependsOn: [] };
    }
  }

  private node(id: string): MavenGraphNode | undefined {
    return this.#graph.nodes[id];
  }

  connect(parentId: string, id: string) {
    this.add(parentId);
    this.add(id);
    const node = this.node(parentId);
    if (!node) return;
    if (!node.dependsOn.includes(id)) {
      node.dependsOn.push(id);
    }
  }

  get graph(): MavenGraph {
    return this.#graph;
  }
}
