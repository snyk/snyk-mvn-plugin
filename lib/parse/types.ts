export interface MavenDependency {
  groupId: string;
  artifactId: string;
  version: string;
  type: string;
  classifier?: string;
  scope?: string;
}

export interface MavenGraph {
  rootId: string;
  nodes: Record<string, MavenGraphNode>;
}

export interface MavenGraphNode {
  dependsOn: string[];
}
