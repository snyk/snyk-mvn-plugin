import { parseResolveResult } from '../../../lib/parse/resolve-parser';

describe('resolve-parser', () => {
  describe('parseResolveResult', () => {
    test('should parse simple project resolve output', () => {
      const resolveOutput = `[INFO] Scanning for projects...
[INFO] 
[INFO] -----------------< io.snyk.example:metaversion-simple >-----------------
[INFO] Building Metaversion Simple Test Project 1.0-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- dependency:3.7.0:resolve (default-cli) @ metaversion-simple ---
[INFO]
[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)
[INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging
[INFO]    jakarta.annotation:jakarta.annotation-api:jar:2.1.1:compile -- module jakarta.annotation
[INFO]    junit:junit:jar:4.13.2:test -- module junit [auto]
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------`;

      const result = parseResolveResult(resolveOutput);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        groupId: 'org.jboss.resteasy',
        artifactId: 'resteasy-core',
        version: '7.0.0.Beta1',
        type: 'jar',
        scope: 'compile',
        projectId: 'io.snyk.example:metaversion-simple',
      });
      expect(result[1]).toEqual({
        groupId: 'org.jboss.logging',
        artifactId: 'jboss-logging',
        version: '3.6.1.Final',
        type: 'jar',
        scope: 'compile',
        projectId: 'io.snyk.example:metaversion-simple',
      });
      expect(result[2]).toEqual({
        groupId: 'jakarta.annotation',
        artifactId: 'jakarta.annotation-api',
        version: '2.1.1',
        type: 'jar',
        scope: 'compile',
        projectId: 'io.snyk.example:metaversion-simple',
      });
      expect(result[3]).toEqual({
        groupId: 'junit',
        artifactId: 'junit',
        version: '4.13.2',
        type: 'jar',
        scope: 'test',
        projectId: 'io.snyk.example:metaversion-simple',
      });
    });

    test('should parse aggregate project resolve output', () => {
      const resolveOutput = `[INFO] Scanning for projects...
[INFO] ------------------------------------------------------------------------
[INFO] Reactor Build Order:
[INFO]
[INFO] Metaversion Aggregate Test Project                                 [pom]
[INFO] Core Module with Metaversions                                      [jar]
[INFO] Web Module with Metaversions                                       [jar]
[INFO]
[INFO] ---------------< io.snyk.example:metaversion-aggregate >----------------
[INFO] Building Metaversion Aggregate Test Project 1.0-SNAPSHOT           [1/3]
[INFO]   from pom.xml
[INFO] --------------------------------[ pom ]---------------------------------
[INFO]
[INFO] --- dependency:3.7.0:resolve (default-cli) @ metaversion-aggregate ---
[INFO]
[INFO] The following files have been resolved:
[INFO]    none
[INFO]
[INFO]
[INFO] --------------------< io.snyk.example:module-core >---------------------
[INFO] Building Core Module with Metaversions 1.0-SNAPSHOT                [2/3]
[INFO]   from module-core/pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- dependency:3.7.0:resolve (default-cli) @ module-core ---
[INFO]
[INFO] The following files have been resolved:
[INFO]    org.apache.httpcomponents:httpclient:jar:4.5.14:compile -- module org.apache.httpcomponents.httpclient [auto]
[INFO]    org.springframework:spring-core:jar:7.0.0-M8:compile -- module spring.core [auto]
[INFO]
[INFO]
[INFO] ---------------------< io.snyk.example:module-web >---------------------
[INFO] Building Web Module with Metaversions 1.0-SNAPSHOT                 [3/3]
[INFO]   from module-web/pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- dependency:3.7.0:resolve (default-cli) @ module-web ---
[INFO]
[INFO] The following files have been resolved:
[INFO]    io.snyk.example:module-core:jar:1.0-SNAPSHOT:compile -- module module.core (auto)
[INFO]    org.apache.httpcomponents:httpclient:jar:4.5.14:compile -- module org.apache.httpcomponents.httpclient [auto]
[INFO]    org.springframework:spring-core:jar:7.0.0-M8:compile -- module spring.core [auto]
[INFO]    org.slf4j:slf4j-api:jar:2.1.0-alpha1:compile -- module org.slf4j
[INFO] ------------------------------------------------------------------------`;

      const result = parseResolveResult(resolveOutput);

      expect(result).toHaveLength(6);

      // Check module-core dependencies
      const coreDeps = result.filter(
        (dep) => dep.projectId === 'io.snyk.example:module-core',
      );
      expect(coreDeps).toHaveLength(2);
      expect(coreDeps[0]).toEqual({
        groupId: 'org.apache.httpcomponents',
        artifactId: 'httpclient',
        version: '4.5.14',
        type: 'jar',
        scope: 'compile',
        projectId: 'io.snyk.example:module-core',
      });

      // Check module-web dependencies
      const webDeps = result.filter(
        (dep) => dep.projectId === 'io.snyk.example:module-web',
      );
      expect(webDeps).toHaveLength(4);
      expect(webDeps[0]).toEqual({
        groupId: 'io.snyk.example',
        artifactId: 'module-core',
        version: '1.0-SNAPSHOT',
        type: 'jar',
        scope: 'compile',
        projectId: 'io.snyk.example:module-web',
      });
    });

    test('should handle empty resolve output', () => {
      const resolveOutput = `[INFO] Scanning for projects...
[INFO] 
[INFO] -----------------< io.snyk.example:empty-project >-----------------
[INFO] Building Empty Project 1.0-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- dependency:3.7.0:resolve (default-cli) @ empty-project ---
[INFO]
[INFO] The following files have been resolved:
[INFO]    none
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------`;

      const result = parseResolveResult(resolveOutput);
      expect(result).toHaveLength(0);
    });

    test('should handle malformed dependency lines', () => {
      const resolveOutput = `[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)
[INFO]    invalid-dependency-line
[INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging
[INFO]    too:few:parts
[INFO]    jakarta.annotation:jakarta.annotation-api:jar:2.1.1:compile -- module jakarta.annotation`;

      const result = parseResolveResult(resolveOutput);
      expect(result).toHaveLength(3);
      expect(result[0].groupId).toBe('org.jboss.resteasy');
      expect(result[1].groupId).toBe('org.jboss.logging');
      expect(result[2].groupId).toBe('jakarta.annotation');
    });
  });
});
