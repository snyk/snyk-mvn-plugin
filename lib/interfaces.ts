export interface MavenDependency {
  groupId: string;
  artifactId: string;
  version: string;
  scope: string; // Assuming all dependencies come with a scope for simplicity
}

export interface ParsedNode {
  dependency: MavenDependency;
  children: ParsedNode[];
}
