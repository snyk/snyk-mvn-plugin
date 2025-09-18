import * as path from 'path';
import * as subProcess from '../sub-process';
import { debug } from '../index';
import { parseVersions } from '../parse-versions';
import { parsePluginVersionFromStdout } from '../parse';
import { MavenContext } from './context';
import { DependencyTreeError } from './errors';

export interface MavenDependencyTreeResult {
  dependencyTreeResult: string;
  javaVersion?: string;
  mavenVersion?: string;
  mavenPluginVersion?: string;
  command: string;
  args: string[];
}

export interface DependencyTreeOptions {
  mavenAggregateProject?: boolean;
  verboseEnabled?: boolean;
  args?: string[];
}

export function buildArgs(
  context: MavenContext,
  mavenArgs: string[],
  mavenAggregateProject = false,
  verboseEnabled = false,
) {
  let args: string[] = [];

  if (mavenAggregateProject && !verboseEnabled) {
    // to workaround an issue in maven-dependency-tree plugin
    // when unpublished artifacts do not exist in either a local or remote repository
    // see https://stackoverflow.com/questions/1677473/maven-doesnt-recognize-sibling-modules-when-running-mvn-dependencytree
    // addendum: if verboseEnabled we are already forcing a newer maven-dependency-plugin, so this is not required
    args = args.concat('test-compile');
  }

  // when using verbose ensure maven-dependency-plugin version 3 is used
  // lower versions do not work with -DoutputType=dot
  const mavenDependencyPlugin = verboseEnabled
    ? 'org.apache.maven.plugins:maven-dependency-plugin:3.6.1:tree'
    : 'dependency:tree';

  // Requires Maven >= 2.2
  args = args.concat([
    mavenDependencyPlugin, // use dependency plugin to display a tree of dependencies
    '-DoutputType=dot', // use 'dot' output format
    '--batch-mode', // clean up output, disables output color and download progress
  ]);

  if (!mavenAggregateProject) {
    args = args.concat('--non-recursive'); // do not include modules unless performing aggregate project scan
  }

  if (context.targetFile && !mavenAggregateProject) {
    // if we are where we can execute - we preserve the original path;
    // if not - we rely on the executor (mvnw) to be spawned at the closest directory, leaving us w/ the file itself
    if (context.root === context.workingDirectory) {
      args.push(`--file="${context.targetFile}"`);
    } else {
      args.push(`--file="${path.basename(context.targetFile)}"`);
    }
  }

  if (
    verboseEnabled &&
    !mavenArgs.includes('-Dverbose') &&
    !mavenArgs.includes('-Dverbose=true')
  ) {
    args = args.concat('-Dverbose');
  }

  args = args.concat(mavenArgs);

  return args;
}

export async function executeMavenDependencyTree(
  context: MavenContext,
  options: DependencyTreeOptions = {},
): Promise<MavenDependencyTreeResult> {
  const {
    mavenAggregateProject = false,
    verboseEnabled = false,
    args = [],
  } = options;

  const mvnArgs = buildArgs(
    context,
    args,
    mavenAggregateProject,
    verboseEnabled,
  );

  debug(`Maven command: ${context.command} ${mvnArgs.join(' ')}`);
  debug(`Maven working directory: ${context.workingDirectory}`);
  debug(`Verbose enabled: ${verboseEnabled}`);

  try {
    const dependencyTreeResult = await subProcess.execute(
      context.command,
      mvnArgs,
      {
        cwd: context.workingDirectory,
      },
    );

    const versionResult = await subProcess.execute(
      context.command,
      ['--version'],
      {
        cwd: context.workingDirectory,
      },
    );

    const { javaVersion, mavenVersion } = parseVersions(versionResult);
    const mavenPluginVersion =
      parsePluginVersionFromStdout(dependencyTreeResult);

    return {
      dependencyTreeResult,
      javaVersion,
      mavenVersion,
      mavenPluginVersion,
      command: context.command,
      args: mvnArgs,
    };
  } catch (error) {
    throw new DependencyTreeError(context.command, mvnArgs, error);
  }
}
