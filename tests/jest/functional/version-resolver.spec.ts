import {
  createVersionResolver,
  isMetaversion,
} from '../../../lib/parse/version-resolver';

describe('version-resolver', () => {
  describe('createVersionResolver', () => {
    test('should create resolver from simple project resolve output', () => {
      const resolveOutput = `[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)
[INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging
[INFO]    junit:junit:jar:4.13.2:test -- module junit [auto]`;

      const resolver = createVersionResolver(resolveOutput);

      // Test resolveVersion
      expect(
        resolver.resolveVersion('org.jboss.resteasy', 'resteasy-core'),
      ).toBe('7.0.0.Beta1');
      expect(
        resolver.resolveVersion('org.jboss.logging', 'jboss-logging'),
      ).toBe('3.6.1.Final');
      expect(resolver.resolveVersion('junit', 'junit')).toBe('4.13.2');

      // Test hasResolution
      expect(
        resolver.hasResolution('org.jboss.resteasy', 'resteasy-core'),
      ).toBe(true);
      expect(resolver.hasResolution('org.jboss.logging', 'jboss-logging')).toBe(
        true,
      );
      expect(resolver.hasResolution('nonexistent', 'dependency')).toBe(false);
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

      // Test project-specific resolution
      expect(
        resolver.resolveVersion(
          'org.apache.httpcomponents',
          'httpclient',
          'io.snyk.example:module-core',
        ),
      ).toBe('4.5.14');
      expect(
        resolver.resolveVersion(
          'org.springframework',
          'spring-core',
          'io.snyk.example:module-core',
        ),
      ).toBe('7.0.0-M8');
      expect(
        resolver.resolveVersion(
          'org.slf4j',
          'slf4j-api',
          'io.snyk.example:module-web',
        ),
      ).toBe('2.1.0-alpha1');

      // Test resolution from specific project
      expect(
        resolver.resolveVersion(
          'org.apache.httpcomponents',
          'httpclient',
          'io.snyk.example:module-core',
        ),
      ).toBe('4.5.14');
      expect(
        resolver.resolveVersion(
          'org.springframework',
          'spring-core',
          'io.snyk.example:module-core',
        ),
      ).toBe('7.0.0-M8');

      // Test getResolutionsForProject
      const coreResolutions = resolver.getResolutionsForProject(
        'io.snyk.example:module-core',
      );
      expect(coreResolutions.size).toBe(2);
      expect(
        coreResolutions.get('org.apache.httpcomponents:httpclient')?.version,
      ).toBe('4.5.14');

      const webResolutions = resolver.getResolutionsForProject(
        'io.snyk.example:module-web',
      );
      expect(webResolutions.size).toBe(4);
      expect(webResolutions.get('org.slf4j:slf4j-api')?.version).toBe(
        '2.1.0-alpha1',
      );
    });

    test('should handle empty resolve output', () => {
      const resolveOutput = `[INFO] The following files have been resolved:
[INFO]    none`;

      const resolver = createVersionResolver(resolveOutput);

      expect(resolver.resolveVersion('any', 'dependency')).toBeUndefined();
      expect(resolver.hasResolution('any', 'dependency')).toBe(false);
    });

    test('should handle malformed resolve output gracefully', () => {
      const resolveOutput = `[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)
[INFO]    invalid-dependency-line
[INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging`;

      const resolver = createVersionResolver(resolveOutput);

      // Global map is now empty
      expect(
        resolver.resolveVersion('org.jboss.resteasy', 'resteasy-core'),
      ).toBe('7.0.0.Beta1');
      expect(
        resolver.resolveVersion('org.jboss.logging', 'jboss-logging'),
      ).toBe('3.6.1.Final');
    });
  });

  describe('isMetaversion', () => {
    test('should identify metaversions correctly', () => {
      expect(isMetaversion('RELEASE')).toBe(true);
      expect(isMetaversion('LATEST')).toBe(true);
      expect(isMetaversion('1.0.0')).toBe(false);
      expect(isMetaversion('1.0.0-SNAPSHOT')).toBe(false);
      expect(isMetaversion('2.3.4.Final')).toBe(false);
      expect(isMetaversion('1.2.3.RELEASE')).toBe(false);
      expect(isMetaversion('')).toBe(false);
    });
  });
});
