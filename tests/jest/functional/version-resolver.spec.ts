import { createVersionResolver } from '../../../lib/parse/version-resolver';

describe('version-resolver', () => {
  describe('createVersionResolver', () => {
    test('should create resolver from simple project resolve output', () => {
      const resolveOutput = `[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)
[INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging
[INFO]    junit:junit:jar:4.13.2:test -- module junit [auto]`;

      const resolver = createVersionResolver(resolveOutput);

      // Test resolveDependencyId with metaversions
      expect(
        resolver.resolveDependencyId(
          'org.jboss.resteasy:resteasy-core:jar:RELEASE:compile',
        ),
      ).toBe('org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile');
      expect(
        resolver.resolveDependencyId(
          'org.jboss.logging:jboss-logging:jar:LATEST:compile',
        ),
      ).toBe('org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile');

      // Test with concrete version (should pass through unchanged)
      expect(resolver.resolveDependencyId('junit:junit:jar:4.13.2:test')).toBe(
        'junit:junit:jar:4.13.2:test',
      );
    });

    test('should create resolver from aggregate project resolve output', () => {
      const resolveOutput = `[INFO] --------------------< io.snyk.example:module-core >---------------------
[INFO] The following files have been resolved:
[INFO]    org.apache.httpcomponents:httpclient:jar:4.5.14:compile -- module org.apache.httpcomponents.httpclient [auto]
[INFO]    org.springframework:spring-core:jar:7.0.0-M8:compile -- module spring.core [auto]
[INFO]
[INFO] ---------------------< io.snyk.example:module-web >---------------------
[INFO] The following files have been resolved:
[INFO]    io.snyk.example:module-core:jar:1.0-SNAPSHOT:compile -- module module.core (auto)
[INFO]    org.apache.httpcomponents:httpclient:jar:4.5.14:compile -- module org.apache.httpcomponents.httpclient [auto]
[INFO]    org.springframework:spring-core:jar:7.0.0-M8:compile -- module spring.core [auto]
[INFO]    org.slf4j:slf4j-api:jar:2.1.0-alpha1:compile -- module org.slf4j`;

      const resolver = createVersionResolver(resolveOutput);

      // Test project-specific resolution with metaversions
      expect(
        resolver.resolveDependencyId(
          'org.apache.httpcomponents:httpclient:jar:RELEASE:compile',
          'io.snyk.example:module-core',
        ),
      ).toBe('org.apache.httpcomponents:httpclient:jar:4.5.14:compile');
      expect(
        resolver.resolveDependencyId(
          'org.springframework:spring-core:jar:LATEST:compile',
          'io.snyk.example:module-core',
        ),
      ).toBe('org.springframework:spring-core:jar:7.0.0-M8:compile');
      expect(
        resolver.resolveDependencyId(
          'org.slf4j:slf4j-api:jar:LATEST:compile',
          'io.snyk.example:module-web',
        ),
      ).toBe('org.slf4j:slf4j-api:jar:2.1.0-alpha1:compile');
    });

    test('should handle empty resolve output', () => {
      const resolveOutput = `[INFO] The following files have been resolved:
[INFO]    none`;

      const resolver = createVersionResolver(resolveOutput);

      expect(
        resolver.resolveDependencyId('any:dependency:jar:RELEASE:compile'),
      ).toBe('any:dependency:jar:RELEASE:compile');
    });

    test('should handle malformed resolve output gracefully', () => {
      const resolveOutput = `[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)
[INFO]    invalid-dependency-line
[INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging`;

      const resolver = createVersionResolver(resolveOutput);

      // Should still resolve correctly despite malformed lines
      expect(
        resolver.resolveDependencyId(
          'org.jboss.resteasy:resteasy-core:jar:RELEASE:compile',
        ),
      ).toBe('org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile');
      expect(
        resolver.resolveDependencyId(
          'org.jboss.logging:jboss-logging:jar:LATEST:compile',
        ),
      ).toBe('org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile');
    });
  });
});
