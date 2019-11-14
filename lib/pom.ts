/**
 * Create pom.xml file using given groupId, artificatId and version.
 *
 * @param groupId uniquely identifies this project across all projects.
 * @param artifactId is the name of the jar without version.
 * @param version any typical version with numbers and dots (1.0, 1.1, 1.0.1, etc), defaults to 1.0.0-SNAPSHOT.
 */
export function createPom(
  groupId: string,
  artifactId: string,
  version: string = '1.0.0-SNAPSHOT',
): string {
  // the awkward indentation here is important to retain final xml formatting
  return `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${groupId}</groupId>
  <artifactId>${artifactId}</artifactId>
  <packaging>jar</packaging>
  <version>${version}</version>
  <dependencies>
  </dependencies>
</project>
`;
}
