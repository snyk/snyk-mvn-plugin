import { executeMavenDependencyResolve } from './dependency-resolve';
import { executeMavenDependencyTree } from './dependency-tree';
import { MavenContext } from './context';
import {
  createVersionResolver,
  VersionResolver,
} from '../parse/version-resolver';
import { debug } from '../index';

export interface MavenExecutionResult {
  versionResolver?: VersionResolver;
  dependencyTreeResult: string;
  javaVersion?: string;
  mavenVersion?: string;
  mavenPluginVersion?: string;
  command: string;
  args: string[];
}

/**
 * Execute the complete Maven pipeline: dependency:resolve (optional) + dependency:tree (required)
 */
export async function executeMavenPipeline(
  context: MavenContext,
  mavenAggregateProject = false,
  verboseEnabled: boolean,
  args: string[],
): Promise<MavenExecutionResult> {
  // 1. Try dependency:resolve with graceful degradation
  let versionResolver: VersionResolver | undefined;
  try {
    const resolveResult = await executeMavenDependencyResolve(
      context,
      mavenAggregateProject,
      args,
    );
    debug(`Resolve result: ${resolveResult.resolveResult}`);

    // Parse immediately and fail fast if there's an issue
    versionResolver = createVersionResolver(resolveResult.resolveResult);
  } catch (err) {
    debug(`Version resolution failed: ${err}`);
    // Continue without version resolution - graceful degradation
  }

  // 2. Execute dependency:tree (required)
  const treeResult = await executeMavenDependencyTree(
    context,
    mavenAggregateProject,
    verboseEnabled,
    args,
  );

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
