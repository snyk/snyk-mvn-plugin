import * as path from 'path';
import * as subProcess from '../sub-process';
import { debug } from '../index';
import { MavenContext } from './context';
import { MAVEN_DEPENDENCY_PLUGIN_VERSION } from './version';

export function buildArgs(
  context: MavenContext,
  mavenArgs: string[],
  mavenAggregateProject = false,
  pluginVersion: string = MAVEN_DEPENDENCY_PLUGIN_VERSION,
) {
  let args: string[] = [];

  if (mavenAggregateProject) {
    // to workaround an issue in maven-dependency-tree plugin
    // when unpublished artifacts do not exist in either a local or remote repository
    // see https://stackoverflow.com/questions/1677473/maven-doesnt-recognize-sibling-modules-when-running-mvn-dependencytree
    args = args.concat('test-compile');
  }

  // Ensure recent maven-dependency-plugin is used
  const mavenDependencyPlugin = `org.apache.maven.plugins:maven-dependency-plugin:${pluginVersion}:resolve`;

  args = args.concat([
    mavenDependencyPlugin,
    '--batch-mode', // clean up output, disables output color and download progress
  ]);

  if (!mavenAggregateProject) {
    args = args.concat('--non-recursive'); // do not include modules unless performing aggregate project scan
  }

  if (context.targetFile && !mavenAggregateProject) {
    // if we are where we can execute - we preserve the original path;
    // if not - we rely on the executor (mvnw) to be spawned at the closest directory, leaving us w/ the file itself
    if (context.root === context.workingDirectory) {
      args.push('--file', context.targetFile);
    } else {
      args.push('--file', path.basename(context.targetFile));
    }
  }

  if (mavenAggregateProject) {
    args = args.concat('-Dmaven.test.skip=true', '-Dmaven.main.skip=true');
  }

  args = args.concat(mavenArgs);

  return args;
}

export async function executeMavenDependencyResolve(
  context: MavenContext,
  mavenAggregateProject: boolean,
  args: string[],
  pluginVersion: string = MAVEN_DEPENDENCY_PLUGIN_VERSION,
): Promise<string> {
  const mvnArgs = buildArgs(
    context,
    args,
    mavenAggregateProject,
    pluginVersion,
  );

  debug(`Maven command: ${context.command} ${mvnArgs.join(' ')}`);
  debug(`Maven working directory: ${context.workingDirectory}`);

  try {
    return await subProcess.execute(context.command, mvnArgs, {
      cwd: context.workingDirectory,
    });
  } catch (error) {
    debug(
      `dependency:resolve execution failed - command: ${
        context.command
      } ${mvnArgs.join(' ')}`,
    );
    debug(`dependency:resolve working directory: ${context.workingDirectory}`);
    throw error; // Re-throw for upstream handling in executor.ts
  }
}
