import {
  executeMavenDependencyResolve,
  MavenDependencyResolveResult,
} from './dependency-resolve';
import { executeMavenDependencyTree } from './dependency-tree';
import { MavenContext } from './context';
import { getMavenVersion, selectPluginVersion } from './version';
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

function logMavenCommandOutput(
  phase: string,
  command: string,
  args: string[],
  output: string,
) {
  if (!output) {
    debug(
      `>>> Maven ${phase} output (${command} ${args.join(' ')}): <no output>`,
    );
    return;
  }

  debug(`>>> Maven ${phase} output (${command} ${args.join(' ')}):`, output);
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
  logMavenOutput = false,
): Promise<MavenExecutionResult> {
  // Get Maven version to select appropriate maven-dependency-plugin version
  // This is used for verbose mode (dependency:tree) and dependency:resolve
  const { javaVersion, mavenVersion } = await getMavenVersion(context);
  const explicitPluginVersion = selectPluginVersion(mavenVersion);
  debug(
    `Maven version: ${mavenVersion}, explicit plugin version: ${explicitPluginVersion}`,
  );

  const treeResult = await executeMavenDependencyTree(
    context,
    mavenAggregateProject,
    verboseEnabled,
    args,
    explicitPluginVersion,
  );

  if (logMavenOutput) {
    logMavenCommandOutput(
      'dependency:tree',
      treeResult.command,
      treeResult.args,
      treeResult.dependencyTreeResult,
    );
  }

  const hasMetaversions = detectMetaversions(treeResult.dependencyTreeResult);
  debug(`Metaversions detected: ${hasMetaversions}`);

  // Conditionally run dependency:resolve only if metaversions are present
  let versionResolver: VersionResolver;
  if (hasMetaversions) {
    try {
      debug('Running dependency:resolve for metaversion resolution');
      const resolveResult: MavenDependencyResolveResult =
        await executeMavenDependencyResolve(
          context,
          mavenAggregateProject,
          args,
          explicitPluginVersion,
        );

      if (logMavenOutput) {
        logMavenCommandOutput(
          'dependency:resolve',
          resolveResult.command,
          resolveResult.args,
          resolveResult.dependencyResolveResult,
        );
      } else {
        debug(`Resolve result: ${resolveResult.dependencyResolveResult}`);
      }

      // Parse immediately and fail fast if there's an issue
      versionResolver = createVersionResolver(
        resolveResult.dependencyResolveResult,
      );
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
    javaVersion,
    mavenVersion,
    mavenPluginVersion: treeResult.mavenPluginVersion,
    command: treeResult.command,
    args: treeResult.args,
  };
}
