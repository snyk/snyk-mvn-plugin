import { executeMavenPipeline } from '../../../../lib/maven/executor';
import * as dependencyTree from '../../../../lib/maven/dependency-tree';
import * as dependencyResolve from '../../../../lib/maven/dependency-resolve';
import { createMavenContext } from '../../../../lib/maven/context';
import { NO_OP_VERSION_RESOLVER } from '../../../../lib/parse/version-resolver';

jest.mock('../../../../lib/maven/dependency-tree');
jest.mock('../../../../lib/maven/dependency-resolve');

const mockExecuteMavenDependencyTree =
  dependencyTree.executeMavenDependencyTree as jest.MockedFunction<
    typeof dependencyTree.executeMavenDependencyTree
  >;
const mockExecuteMavenDependencyResolve =
  dependencyResolve.executeMavenDependencyResolve as jest.MockedFunction<
    typeof dependencyResolve.executeMavenDependencyResolve
  >;

describe('executeMavenPipeline conditional logic', () => {
  const context = createMavenContext('.', 'pom.xml');

  beforeEach(() => {
    jest.clearAllMocks();

    // Default tree result mock
    mockExecuteMavenDependencyTree.mockResolvedValue({
      dependencyTreeResult: '',
      javaVersion: '17.0.1',
      mavenVersion: '3.8.1',
      mavenPluginVersion: '3.6.1',
      command: 'mvn',
      args: ['dependency:tree', '--batch-mode'],
    });
  });

  test('should skip dependency:resolve when no metaversions detected', async () => {
    // Mock tree output WITHOUT metaversions (RELEASE/LATEST)
    mockExecuteMavenDependencyTree.mockResolvedValue({
      dependencyTreeResult: `digraph "com.example:test:jar:1.0.0" {
"com.example:test:jar:1.0.0" -> "junit:junit:jar:4.13.2:test" ;
"com.example:test:jar:1.0.0" -> "org.slf4j:slf4j-api:jar:1.7.30:compile" ;
}`,
      javaVersion: '17.0.1',
      mavenVersion: '3.8.1',
      mavenPluginVersion: '3.6.1',
      command: 'mvn',
      args: ['dependency:tree', '--batch-mode'],
    });

    const result = await executeMavenPipeline(context, false, false, []);

    // Verify dependency:tree was called
    expect(mockExecuteMavenDependencyTree).toHaveBeenCalledTimes(1);
    expect(mockExecuteMavenDependencyTree).toHaveBeenCalledWith(
      context,
      false,
      false,
      [],
    );

    // Verify dependency:resolve was NOT called (optimization working)
    expect(mockExecuteMavenDependencyResolve).toHaveBeenCalledTimes(0);

    // Verify NO_OP_VERSION_RESOLVER is used
    expect(result.versionResolver).toBe(NO_OP_VERSION_RESOLVER);

    // Verify other result properties
    expect(result.dependencyTreeResult).toContain(
      'junit:junit:jar:4.13.2:test',
    );
    expect(result.javaVersion).toBe('17.0.1');
    expect(result.mavenVersion).toBe('3.8.1');
  });

  test('should execute dependency:resolve when metaversions detected', async () => {
    // Mock tree output WITH metaversions (RELEASE/LATEST)
    mockExecuteMavenDependencyTree.mockResolvedValue({
      dependencyTreeResult: `digraph "com.example:test:jar:1.0.0" {
"com.example:test:jar:1.0.0" -> "junit:junit:jar:RELEASE:test" ;
"com.example:test:jar:1.0.0" -> "org.slf4j:slf4j-api:jar:LATEST:compile" ;
}`,
      javaVersion: '17.0.1',
      mavenVersion: '3.8.1',
      mavenPluginVersion: '3.6.1',
      command: 'mvn',
      args: ['dependency:tree', '--batch-mode'],
    });

    // Mock resolve result with resolved versions
    mockExecuteMavenDependencyResolve.mockResolvedValue(`[INFO] The following files have been resolved:
[INFO]    junit:junit:jar:4.13.2:test -- module junit [auto]
[INFO]    org.slf4j:slf4j-api:jar:1.7.36:compile -- module org.slf4j.api`);

    const result = await executeMavenPipeline(context, false, false, []);

    // Verify both dependency:tree and dependency:resolve were called
    expect(mockExecuteMavenDependencyTree).toHaveBeenCalledTimes(1);
    expect(mockExecuteMavenDependencyResolve).toHaveBeenCalledTimes(1);
    expect(mockExecuteMavenDependencyResolve).toHaveBeenCalledWith(
      context,
      false,
      [],
    );

    // Verify a real VersionResolver is used (not NO_OP)
    expect(result.versionResolver).not.toBe(NO_OP_VERSION_RESOLVER);

    // Verify the resolver can actually resolve metaversions
    const resolvedId = result.versionResolver.resolveDependencyId(
      'junit:junit:jar:RELEASE:test',
    );
    expect(resolvedId).toBe('junit:junit:jar:4.13.2:test');
  });

  test('should gracefully degrade when dependency:resolve fails', async () => {
    // Mock tree output WITH metaversions
    mockExecuteMavenDependencyTree.mockResolvedValue({
      dependencyTreeResult: `digraph "com.example:test:jar:1.0.0" {
"com.example:test:jar:1.0.0" -> "junit:junit:jar:LATEST:test" ;
}`,
      javaVersion: '17.0.1',
      mavenVersion: '3.8.1',
      mavenPluginVersion: '3.6.1',
      command: 'mvn',
      args: ['dependency:tree', '--batch-mode'],
    });

    // Mock resolve failure (network error, permission issue, etc.)
    mockExecuteMavenDependencyResolve.mockRejectedValue(
      new Error('Maven dependency:resolve failed with exit code 1'),
    );

    const result = await executeMavenPipeline(context, false, false, []);

    // Verify both commands were attempted
    expect(mockExecuteMavenDependencyTree).toHaveBeenCalledTimes(1);
    expect(mockExecuteMavenDependencyResolve).toHaveBeenCalledTimes(1);

    // Verify graceful degradation - NO_OP_VERSION_RESOLVER is used as fallback
    expect(result.versionResolver).toBe(NO_OP_VERSION_RESOLVER);

    // Verify we still get a valid result (pipeline doesn't fail completely)
    expect(result.dependencyTreeResult).toContain(
      'junit:junit:jar:LATEST:test',
    );
    expect(result.javaVersion).toBe('17.0.1');
  });

  test('should handle aggregate projects correctly', async () => {
    mockExecuteMavenDependencyTree.mockResolvedValue({
      dependencyTreeResult: `digraph "com.example:parent:pom:1.0.0" {
"com.example:parent:pom:1.0.0" -> "com.example:module-a:jar:RELEASE:compile" ;
}`,
      javaVersion: '17.0.1',
      mavenVersion: '3.8.1',
      mavenPluginVersion: '3.6.1',
      command: 'mvn',
      args: ['test-compile', 'dependency:tree', '--batch-mode'],
    });

    mockExecuteMavenDependencyResolve.mockResolvedValue(`[INFO] The following files have been resolved:
[INFO]    com.example:module-a:jar:1.0.0:compile -- module com.example.module.a`);

    const result = await executeMavenPipeline(context, true, false, [
      '-Pprofile',
    ]);

    // Verify aggregate project flag is passed through correctly
    expect(mockExecuteMavenDependencyTree).toHaveBeenCalledWith(
      context,
      true, // mavenAggregateProject = true
      false,
      ['-Pprofile'],
    );

    expect(mockExecuteMavenDependencyResolve).toHaveBeenCalledWith(
      context,
      true, // mavenAggregateProject = true
      ['-Pprofile'],
    );

    expect(result.versionResolver).not.toBe(NO_OP_VERSION_RESOLVER);
  });
});
