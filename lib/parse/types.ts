export interface MavenDependency {
  groupId: string;
  artifactId: string;
  version: string;
  type: string;
  classifier?: string;
  scope?: string;
}
