/**
 * Create pom.xml file using given groupId, artificatId and version.
 *
 * @param name name of project to be used as project group and artifact id
 * @param dependency
 *  * @groupId uniquely identifies this project across all projects.
 *  * @artifactId is the name of the jar without version.
 *  * @packaging packaging type for this project
 *  * @version any typical version with numbers and dots (1.0, 1.1, 1.0.1, etc), defaults to 1.0.0-SNAPSHOT.
 */
export function createPom(
  dependency: {
    groupId: string;
    artifactId: string;
    version: string;
  },
  name: string = 'dummy',
): string {
  // the awkward indentation here is important to retain final xml formatting
  return `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${name}</groupId>
  <artifactId>${name}</artifactId>
  <packaging>jar</packaging>
  <version>1.0.0-SNAPSHOT</version>
  <name>${name}</name>
  <dependencies>
    <dependency>
      <groupId>${dependency.groupId}</groupId>
      <artifactId>${dependency.artifactId}</artifactId>
      <version>${dependency.version}</version>
    </dependency>
  </dependencies>
</project>
`;
}
