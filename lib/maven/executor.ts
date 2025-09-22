import { executeMavenDependencyResolve } from './dependency-resolve';
import { executeMavenDependencyTree } from './dependency-tree';
import { MavenContext } from './context';
import {
  createVersionResolver,
  VersionResolver,
  NO_OP_VERSION_RESOLVER,
} from '../parse/version-resolver';
import { debug } from '../index';

/**
 * Detect if Maven dependency tree output contains metaversions that require resolution
 *
 * @param dependencyTreeStdout Raw stdout from mvn dependency:tree
 * @returns true if metaversions (RELEASE, LATEST) are detected
 */
function detectMetaversions(dependencyTreeStdout: string): boolean {
  // Fast string search with precise colon boundaries to avoid false positives
  return (
    dependencyTreeStdout.includes(':RELEASE:') ||
    dependencyTreeStdout.includes(':LATEST:')
  );
}

export interface MavenExecutionResult {
  versionResolver: VersionResolver;
  dependencyTreeResult: string;
  javaVersion?: string;
  mavenVersion?: string;
  mavenPluginVersion?: string;
  command: string;
  args: string[];
}

/**
 * Execute the optimal Maven pipeline: dependency:tree (required) + dependency:resolve (conditional)
 *
 * Performance optimization: Only runs dependency:resolve if metaversions are detected,
 * avoiding ~2x execution time penalty when metaversions are absent (95%+ of cases).
 */
export async function executeMavenPipeline(
  context: MavenContext,
  mavenAggregateProject = false,
  verboseEnabled: boolean,
  args: string[],
): Promise<MavenExecutionResult> {
  // Execute dependency:tree first (always required)
  const treeResult = await executeMavenDependencyTree(
    context,
    mavenAggregateProject,
    verboseEnabled,
    args,
  );

  const hasMetaversions = detectMetaversions(treeResult.dependencyTreeResult);
  debug(`Metaversions detected: ${hasMetaversions}`);

  // Conditionally run dependency:resolve only if metaversions are present
  let versionResolver: VersionResolver;
  if (hasMetaversions) {
    try {
      debug('Running dependency:resolve for metaversion resolution');
      const resolveResult = await executeMavenDependencyResolve(
        context,
        mavenAggregateProject,
        args,
      );
      debug(`Resolve result: ${resolveResult}`);

      // Parse immediately and fail fast if there's an issue
      versionResolver = createVersionResolver(resolveResult);
    } catch (err) {
      debug(`Version resolution failed: ${err}`);
      // Graceful degradation using no-op version resolver
      versionResolver = NO_OP_VERSION_RESOLVER;
    }
  } else {
    debug(
      'No metaversions detected - using no-op resolver for optimal performance',
    );
    versionResolver = NO_OP_VERSION_RESOLVER;
  }

  return {
    versionResolver,
    dependencyTreeResult: treeResult.dependencyTreeResult,
    javaVersion: treeResult.javaVersion,
    mavenVersion: treeResult.mavenVersion,
    mavenPluginVersion: treeResult.mavenPluginVersion,
    command: treeResult.command,
    args: treeResult.args,
  };
}
