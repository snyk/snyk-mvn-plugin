import * as path from 'path';
import * as subProcess from '../sub-process';
import { DependencyTreeStdoutFilter } from '../parse/stdout-filter';
import { debug } from '../index';
import { parsePluginVersionFromStdout } from '../parse/dependency-tree-parser';
import { MavenContext } from './context';
import { MAVEN_DEPENDENCY_PLUGIN_VERSION } from './version';
import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';

export interface MavenDependencyTreeResult {
  dependencyTreeResult: string;
  // Set only when the output was too large to keep in full: the end of the
  // raw Maven output, for debugging, since dependencyTreeResult then holds
  // only the lines the parsers read.
  rawOutputTail?: string;
  mavenPluginVersion?: string;
  command: string;
  args: string[];
}

export function buildArgs(
  context: MavenContext,
  mavenArgs: string[],
  mavenAggregateProject = false,
  verboseEnabled = false,
  pluginVersion: string = MAVEN_DEPENDENCY_PLUGIN_VERSION,
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
    ? `org.apache.maven.plugins:maven-dependency-plugin:${pluginVersion}:tree`
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
      args.push('--file', context.targetFile);
    } else {
      args.push('--file', path.basename(context.targetFile));
    }
  }

  if (mavenAggregateProject && !verboseEnabled) {
    args = args.concat('-Dmaven.test.skip=true', '-Dmaven.main.skip=true');
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
  mavenAggregateProject: boolean,
  verboseEnabled: boolean,
  args: string[],
  pluginVersion: string = MAVEN_DEPENDENCY_PLUGIN_VERSION,
): Promise<MavenDependencyTreeResult> {
  const mvnArgs = buildArgs(
    context,
    args,
    mavenAggregateProject,
    verboseEnabled,
    pluginVersion,
  );

  debug(`Maven command: ${context.command} ${mvnArgs.join(' ')}`);
  debug(`Maven working directory: ${context.workingDirectory}`);
  debug(`Verbose enabled: ${verboseEnabled}`);

  // SNYK_MVN_DISABLE_OUTPUT_FILTER restores the previous behaviour of always
  // holding the full Maven output.
  const stdoutFilter = process.env.SNYK_MVN_DISABLE_OUTPUT_FILTER
    ? undefined
    : new DependencyTreeStdoutFilter();
  try {
    const dependencyTreeResult = await subProcess.execute(
      context.command,
      mvnArgs,
      {
        cwd: context.workingDirectory,
        stdoutFilter,
      },
    );

    const mavenPluginVersion =
      parsePluginVersionFromStdout(dependencyTreeResult);

    return {
      dependencyTreeResult,
      rawOutputTail: stdoutFilter?.isFiltering()
        ? stdoutFilter.rawTail()
        : undefined,
      mavenPluginVersion,
      command: context.command,
      args: mvnArgs,
    };
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('Non-parseable POM')) {
        throw new OpenSourceEcosystems.UnableToParseXMLError(
          'Error parsing the XML file',
        );
      }
    }

    throw new OpenSourceEcosystems.FailedToBuildMavenProjectError(
      'Cannot build Maven dependency tree',
    );
  }
}
