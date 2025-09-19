import type { MavenGraph, MavenGraphNode } from './types';
import type { VersionResolver } from './version-resolver';
import { NO_OP_VERSION_RESOLVER } from './version-resolver';

export class MavenGraphBuilder {
  readonly #graph: MavenGraph;
  readonly #versionResolver: VersionResolver;
  readonly #projectId: string;

  constructor(rootId: string, versionResolver?: VersionResolver) {
    this.#graph = {
      rootId,
      nodes: {
        [rootId]: { dependsOn: [], parents: [], reachesProdDep: false },
      },
    };
    this.#versionResolver = versionResolver ?? NO_OP_VERSION_RESOLVER;
    this.#projectId = this.extractProjectId(rootId);
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
    // Delegate all version resolution complexity to VersionResolver
    const resolvedParentId = this.#versionResolver.resolveDependencyId(
      parentId,
      this.#projectId,
    );
    const resolvedId = this.#versionResolver.resolveDependencyId(
      id,
      this.#projectId,
    );

    const parentNode = this.findOrCreateNode(resolvedParentId);
    const childNode = this.findOrCreateNode(resolvedId);
    if (!childNode.parents.includes(resolvedParentId)) {
      childNode.parents.push(resolvedParentId);
    }
    if (!parentNode.dependsOn.includes(resolvedId)) {
      parentNode.dependsOn.push(resolvedId);
    }
    if (!resolvedId.endsWith(':test')) {
      this.markNodeProdReachable(resolvedId);
    }
  }

  get graph(): MavenGraph {
    return this.#graph;
  }

  /**
   * Extract project ID from Maven rootId
   *
   * Example: "io.snyk.example:metaversion-simple" from
   * "io.snyk.example:metaversion-simple:jar:1.0-SNAPSHOT"
   */
  private extractProjectId(rootId: string): string {
    const parts = rootId.split(':');
    return `${parts[0]}:${parts[1]}`; // groupId:artifactId
  }
}
