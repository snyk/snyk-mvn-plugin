import type { MavenGraph, MavenGraphNode } from './types';
import type { VersionResolver } from './version-resolver';
import { isMetaversion } from './version-resolver';
import { parseDependency, buildDependencyString } from './dependency';

export class MavenGraphBuilder {
  readonly #graph: MavenGraph;
  readonly #versionResolver?: VersionResolver;
  readonly #projectId?: string;

  constructor(rootId: string, versionResolver?: VersionResolver) {
    this.#graph = {
      rootId,
      nodes: {
        [rootId]: { dependsOn: [], parents: [], reachesProdDep: false },
      },
    };
    this.#versionResolver = versionResolver;
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
    // Resolve versions if they are metaversions and we have a version resolver
    const resolvedParentId = this.resolveVersion(parentId);
    const resolvedId = this.resolveVersion(id);

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
   * Resolve a dependency ID by replacing metaversions with concrete versions
   * @param id The dependency ID to resolve
   * @returns The resolved dependency ID with concrete versions
   */
  private resolveVersion(id: string): string {
    if (!this.#versionResolver) {
      return id;
    }

    const dependency = parseDependency(id);

    // Only resolve if this is a metaversion
    if (!isMetaversion(dependency.version)) {
      return id;
    }

    // Try to resolve the metaversion
    const resolvedVersion = this.#versionResolver.resolveVersion(
      dependency.groupId,
      dependency.artifactId,
      this.#projectId,
    );

    if (resolvedVersion) {
      // Build new dependency string with resolved version
      const resolvedDependency = {
        ...dependency,
        version: resolvedVersion,
      };
      return buildDependencyString(resolvedDependency);
    }

    // If resolution failed, return original ID
    return id;
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
