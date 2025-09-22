import { MavenGraphBuilder } from '../../../lib/parse/maven-graph-builder';
import { createVersionResolver } from '../../../lib/parse/version-resolver';

describe('MavenGraphBuilder with version resolution', () => {
  test('should resolve metaversions when version resolver is provided', () => {
    const resolveOutput = `[INFO] --------------------< test:root >---------------------
[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)
[INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging`;

    const versionResolver = createVersionResolver(resolveOutput);
    const builder = new MavenGraphBuilder(
      'test:root:jar:1.0-SNAPSHOT',
      versionResolver,
    );

    // Connect dependencies with metaversions
    builder.connect(
      'test:root:jar:1.0-SNAPSHOT',
      'org.jboss.resteasy:resteasy-core:jar:RELEASE:compile',
    );
    builder.connect(
      'test:root:jar:1.0-SNAPSHOT',
      'org.jboss.logging:jboss-logging:jar:LATEST:compile',
    );
    builder.connect(
      'test:root:jar:1.0-SNAPSHOT',
      'junit:junit:jar:4.13.2:test',
    ); // Non-metaversion

    const graph = builder.graph;

    // Check that metaversions were resolved
    expect(
      graph.nodes['org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile'],
    ).toBeDefined();
    expect(
      graph.nodes['org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile'],
    ).toBeDefined();
    expect(graph.nodes['junit:junit:jar:4.13.2:test']).toBeDefined(); // Unchanged

    // Check that original metaversion nodes don't exist
    expect(graph.nodes).not.toHaveProperty(
      'org.jboss.resteasy:resteasy-core:jar:RELEASE:compile',
    );
    expect(graph.nodes).not.toHaveProperty(
      'org.jboss.logging:jboss-logging:jar:LATEST:compile',
    );
  });

  test('should work without version resolver (backward compatibility)', () => {
    const builder = new MavenGraphBuilder('root');

    builder.connect(
      'root',
      'org.jboss.resteasy:resteasy-core:jar:RELEASE:compile',
    );
    builder.connect(
      'root',
      'org.jboss.logging:jboss-logging:jar:LATEST:compile',
    );

    const graph = builder.graph;

    // Without version resolver, metaversions should remain unchanged
    expect(
      graph.nodes['org.jboss.resteasy:resteasy-core:jar:RELEASE:compile'],
    ).toBeDefined();
    expect(
      graph.nodes['org.jboss.logging:jboss-logging:jar:LATEST:compile'],
    ).toBeDefined();
  });

  test('should handle project-specific version resolution', () => {
    const resolveOutput = `[INFO] --------------------< io.snyk.example:module-core >---------------------
[INFO] The following files have been resolved:
[INFO]    org.apache.httpcomponents:httpclient:jar:4.5.14:compile -- module org.apache.httpcomponents.httpclient [auto]
[INFO]
[INFO] ---------------------< io.snyk.example:module-web >---------------------
[INFO] The following files have been resolved:
[INFO]    org.apache.httpcomponents:httpclient:jar:4.5.15:compile -- module org.apache.httpcomponents.httpclient [auto]`;

    const versionResolver = createVersionResolver(resolveOutput);

    // Test module-core with its specific version
    const coreBuilder = new MavenGraphBuilder(
      'io.snyk.example:module-core:jar:1.0-SNAPSHOT',
      versionResolver,
    );
    coreBuilder.connect(
      'io.snyk.example:module-core:jar:1.0-SNAPSHOT',
      'org.apache.httpcomponents:httpclient:jar:RELEASE:compile',
    );

    const coreGraph = coreBuilder.graph;
    expect(
      coreGraph.nodes[
        'org.apache.httpcomponents:httpclient:jar:4.5.14:compile'
      ],
    ).toBeDefined();

    // Test module-web with its specific version
    const webBuilder = new MavenGraphBuilder(
      'io.snyk.example:module-web:jar:1.0-SNAPSHOT',
      versionResolver,
    );
    webBuilder.connect(
      'io.snyk.example:module-web:jar:1.0-SNAPSHOT',
      'org.apache.httpcomponents:httpclient:jar:RELEASE:compile',
    );

    const webGraph = webBuilder.graph;
    expect(
      webGraph.nodes['org.apache.httpcomponents:httpclient:jar:4.5.15:compile'],
    ).toBeDefined();
  });

  test('should handle resolution failures gracefully', () => {
    const resolveOutput = `[INFO] --------------------< test:root >---------------------
[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)`;

    const versionResolver = createVersionResolver(resolveOutput);
    const builder = new MavenGraphBuilder(
      'test:root:jar:1.0-SNAPSHOT',
      versionResolver,
    );

    // Connect a dependency that can be resolved
    builder.connect(
      'test:root:jar:1.0-SNAPSHOT',
      'org.jboss.resteasy:resteasy-core:jar:RELEASE:compile',
    );
    // Connect a dependency that cannot be resolved
    builder.connect(
      'test:root:jar:1.0-SNAPSHOT',
      'org.nonexistent:dependency:jar:LATEST:compile',
    );

    const graph = builder.graph;

    // Resolved dependency should have concrete version
    expect(
      graph.nodes['org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile'],
    ).toBeDefined();
    // Unresolved dependency should keep original metaversion
    expect(
      graph.nodes['org.nonexistent:dependency:jar:LATEST:compile'],
    ).toBeDefined();
  });

  test('should not resolve non-metaversions', () => {
    const resolveOutput = `[INFO] --------------------< test:root >---------------------
[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)`;

    const versionResolver = createVersionResolver(resolveOutput);
    const builder = new MavenGraphBuilder(
      'test:root:jar:1.0-SNAPSHOT',
      versionResolver,
    );

    // Connect dependencies with concrete versions
    builder.connect(
      'test:root:jar:1.0-SNAPSHOT',
      'org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile',
    );
    builder.connect(
      'test:root:jar:1.0-SNAPSHOT',
      'junit:junit:jar:4.13.2:test',
    );

    const graph = builder.graph;

    // Concrete versions should remain unchanged
    expect(
      graph.nodes['org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile'],
    ).toBeDefined();
    expect(graph.nodes['junit:junit:jar:4.13.2:test']).toBeDefined();
  });

  test('should handle complex dependency chains with version resolution', () => {
    const resolveOutput = `[INFO] --------------------< test:root >---------------------
[INFO] The following files have been resolved:
[INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)
[INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging`;

    const versionResolver = createVersionResolver(resolveOutput);
    const builder = new MavenGraphBuilder(
      'test:root:jar:1.0-SNAPSHOT',
      versionResolver,
    );

    // Build a dependency chain
    builder.connect(
      'test:root:jar:1.0-SNAPSHOT',
      'org.jboss.resteasy:resteasy-core:jar:RELEASE:compile',
    );
    builder.connect(
      'org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile',
      'org.jboss.logging:jboss-logging:jar:LATEST:compile',
    );

    const graph = builder.graph;

    // Check that the chain was built with resolved versions
    expect(
      graph.nodes['org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile'],
    ).toBeDefined();
    expect(
      graph.nodes['org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile'],
    ).toBeDefined();

    // Check that the dependency relationship was maintained
    const resteasyNode =
      graph.nodes['org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile'];
    expect(resteasyNode.dependsOn).toContain(
      'org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile',
    );

    const loggingNode =
      graph.nodes['org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile'];
    expect(loggingNode.parents).toContain(
      'org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile',
    );
  });
});
