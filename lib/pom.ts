/**
 * Maven dependency.
 *
 * * groupId uniquely identifies this project across all projects.
 * * artifactId is the name of the jar without version.
 * * version is any typical version with numbers and dots (1.0, 1.1, 1.0.1, etc).
 */
export interface MavenDependency {
  groupId: string;
  artifactId: string;
  version: string;
}

/**
 * Get pom.xml file contents.
 *
 * @param dependencies array of maven dependencies.
 * @param root root maven dependency.
 */
export function getPomContents(
  dependencies: MavenDependency[],
  root: MavenDependency,
): string {
  // the awkward indentation here is important to retain final xml formatting
  const deps = dependencies.reduce((acc, dep) => {
    acc += `
    <dependency>
      <groupId>${dep.groupId}</groupId>
      <artifactId>${dep.artifactId}</artifactId>
      <version>${dep.version}</version>
    </dependency>`;
    return acc;
  }, '');

  return `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${root.groupId}</groupId>
  <artifactId>${root.artifactId}</artifactId>
  <packaging>jar</packaging>
  <version>${root.version}</version>
  <dependencies>${deps}
  </dependencies>
</project>
`;
}
