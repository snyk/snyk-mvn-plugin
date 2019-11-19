import * as path from 'path';
/**
 * Create pom.xml file contents.
 *
 * @param projectGroupId name of project to be used as project group id
 * @param projectArtifactId name of project to be used as project artifact id
 * @param dependency
 *  * @groupId uniquely identifies this project across all projects.
 *  * @artifactId is the name of the jar without version.
 *  * @packaging packaging type for this project
 *  * @version any typical version with numbers and dots (1.0, 1.1, 1.0.1, etc).
 */
export function createPom(
  dependency: {
    groupId: string;
    artifactId: string;
    version: string;
  },
  { projectGroupId, projectArtifactId },
): string {
  const sepReplaceRegExp = new RegExp(`\\${path.sep}`, 'g');

  // the awkward indentation here is important to retain final xml formatting
  return `<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <groupId>${projectGroupId.replace(sepReplaceRegExp, '.')}</groupId>
  <artifactId>${projectArtifactId.replace(sepReplaceRegExp, '.')}</artifactId>
  <packaging>jar</packaging>
  <version>1.0.0-SNAPSHOT</version>
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
