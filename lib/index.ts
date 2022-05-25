import { legacyPlugin } from '@snyk/cli-interface';
import * as depGraphLib from '@snyk/dep-graph';
import * as javaCallGraphBuilder from '@snyk/java-call-graph-builder';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

import { parseTree, parseVersions } from './parse-mvn';
import * as subProcess from './sub-process';
import {
  createDepGraphFromArchive,
  createDepGraphFromArchives,
  findArchives,
  isArchive,
} from './archive';
import { formatGenericPluginError } from './error-format';
import { CallGraph, CallGraphResult } from '@snyk/cli-interface/legacy/common';
import debugModule = require('debug');

const WRAPPERS = ['mvnw', 'mvnw.cmd'];
// To enable debugging output, use `snyk -d`
let logger: debugModule.Debugger | null = null;

export function debug(s: string) {
  if (logger === null) {
    // Lazy init: Snyk CLI needs to process the CLI argument "-d" first.
    // TODO(BST-648): more robust handling of the debug settings
    if (process.env.DEBUG) {
      debugModule.enable(process.env.DEBUG);
    }
    logger = debugModule('snyk-mvn-plugin');
  }
  logger(s);
}

export interface MavenOptions extends legacyPlugin.BaseInspectOptions {
  scanAllUnmanaged?: boolean;
  reachableVulns?: boolean;
  callGraphBuilderTimeout?: number;
  allProjects?: boolean;
}

export function getCommand(root: string, targetFile: string | undefined) {
  if (!targetFile) {
    return 'mvn';
  }
  const isWinLocal = /^win/.test(os.platform()); // local check, can be stubbed in tests
  const wrapperScript = isWinLocal ? 'mvnw.cmd' : './mvnw';
  // try to find a sibling wrapper script first
  let pathToWrapper = path.resolve(
    root,
    path.dirname(targetFile),
    wrapperScript,
  );
  if (fs.existsSync(pathToWrapper)) {
    return wrapperScript;
  }
  // now try to find a wrapper in the root
  pathToWrapper = path.resolve(root, wrapperScript);
  if (fs.existsSync(pathToWrapper)) {
    return wrapperScript;
  }
  return 'mvn';
}

function getParentDirectory(p: string): string {
  return path.dirname(p);
}

// When we have `mvn`, we can run the subProcess from anywhere.
// However due to https://github.com/takari/maven-wrapper/issues/133, `mvnw` can only be run
// within the directory where `mvnw` exists
function findWrapper(
  mavenCommand: string,
  root: string,
  targetPath: string,
): string {
  if (mavenCommand === 'mvn') {
    return root;
  }

  // In this branch we need to -find- the mvnw location;
  // we start from the containing directory and climb up to the scanned-root-folder
  let foundMVWLocation = false;

  // Look for mvnw in the current directory. if not - climb one up
  let currentFolder = targetPath;
  do {
    if (getParentDirectory(root) === currentFolder || !currentFolder.length) {
      // if we climbed up the tree 1 level higher than our root directory
      throw new Error("Couldn't find mvnw");
    }

    foundMVWLocation = !!WRAPPERS.map((name) => path.join(currentFolder, name)) // paths
      .map(fs.existsSync) // since we're on the client's machine - check if the file exists
      .filter(Boolean).length; // hope for truths & bolleanify
    if (!foundMVWLocation) {
      // if we couldn't find the file, go to the parent, or empty string for quick escape if needed
      currentFolder = getParentDirectory(currentFolder);
    }
  } while (!foundMVWLocation);

  return currentFolder;
}

export async function inspect(
  root: string,
  targetFile?: string,
  options?: MavenOptions,
): Promise<legacyPlugin.InspectResult> {
  const targetPath = targetFile
    ? path.resolve(root, targetFile)
    : path.resolve(root);
  if (!fs.existsSync(targetPath)) {
    throw new Error('Could not find file or directory ' + targetPath);
  }
  if (!options) {
    options = { dev: false, scanAllUnmanaged: false };
  }

  if (targetPath && isArchive(targetPath)) {
    debug(`Creating dep-graph from ${targetPath}`);
    const depGraph = await createDepGraphFromArchive(root, targetPath);
    return {
      plugin: {
        name: 'bundled:maven',
        runtime: 'unknown',
        meta: {},
      },
      package: {}, // using dep-graph over depTree
      dependencyGraph: depGraph,
    };
  }

  if (options.scanAllUnmanaged) {
    const recursive = !!options.allProjects;
    const archives = findArchives(root, recursive);
    if (archives.length > 0) {
      debug(`Creating dep-graph from archives in ${root}`);
      const depGraph = await createDepGraphFromArchives(root, archives);
      return {
        plugin: {
          name: 'bundled:maven',
          runtime: 'unknown',
          meta: {},
        },
        package: {}, // using dep-graph over depTree
        dependencyGraph: depGraph,
      };
    } else {
      throw Error(`Could not find any supported files in '${root}'.`);
    }
  }

  const mavenCommand = getCommand(root, targetFile);
  const mvnWorkingDirectory = findWrapper(mavenCommand, root, targetPath);
  const mvnArgs = buildArgs(
    root,
    mvnWorkingDirectory,
    targetFile,
    options.args,
  );
  let result;
  try {
    debug(`Maven command: ${mavenCommand} ${mvnArgs.join(' ')}`);
    debug(`Maven working directory: ${mvnWorkingDirectory}`);
    result = await subProcess.execute(mavenCommand, mvnArgs, {
      cwd: mvnWorkingDirectory,
    });
    const versionResult = await subProcess.execute(
      `${mavenCommand} --version`,
      [],
      {
        cwd: mvnWorkingDirectory,
      },
    );
    const parseResult = parseTree(result, options.dev);
    const { javaVersion, mavenVersion } = parseVersions(versionResult);
    let callGraph: CallGraphResult | undefined;
    let maybeCallGraphMetrics = {};
    if (options.reachableVulns) {
      // NOTE[muscar] We get the timeout in seconds, and the call graph builder
      // wants it in milliseconds
      const timeout = options?.callGraphBuilderTimeout
        ? options?.callGraphBuilderTimeout * 1000
        : undefined;

      callGraph = await getCallGraph(
        targetPath,
        timeout, // expects ms
        options.args,
      );
      maybeCallGraphMetrics = {
        callGraphMetrics: javaCallGraphBuilder.runtimeMetrics(),
        callGraphBuilderTimeoutSeconds: options?.callGraphBuilderTimeout,
      };
    }
    return {
      plugin: {
        name: 'bundled:maven',
        runtime: 'unknown',
        meta: {
          versionBuildInfo: {
            metaBuildVersion: {
              mavenVersion,
              javaVersion,
            },
          },
          ...maybeCallGraphMetrics,
        },
      },
      package: parseResult.data,
      callGraph,
    };
  } catch (error) {
    if (result) debug(`>>> Output from mvn: ${result}`);
    error.message = formatGenericPluginError(error, mavenCommand, mvnArgs);
    throw error;
  }
}

export function buildArgs(
  rootPath: string,
  executionPath: string,
  targetFile?: string,
  mavenArgs?: string[] | undefined,
) {
  // Requires Maven >= 2.2
  let args = [
    'dependency:tree', // use dependency plugin to display a tree of dependencies
    '-DoutputType=dot', // use 'dot' output format
    '--batch-mode', // clean up output, disables output color and download progress
    '--non-recursive', // do not include sub modules these are handled by separate scans using --all-projects
  ];
  if (targetFile) {
    // if we are where we can execute - we preserve the original path;
    // if not - we rely on the executor (mvnw) to be spawned at the closest directory, leaving us w/ the file itself
    if (rootPath === executionPath) {
      args.push('--file="' + targetFile + '"');
    } else {
      args.push('--file="' + path.basename(targetFile) + '"');
    }
  }
  if (mavenArgs) {
    args = args.concat(mavenArgs);
  }
  return args;
}

async function getCallGraph(
  targetPath: string,
  timeout?: number,
  customMavenArgs?: string[],
): Promise<CallGraphResult> {
  debug(`getting call graph from path ${targetPath}`);
  try {
    const callGraph: CallGraph = await javaCallGraphBuilder.getCallGraphMvn(
      path.dirname(targetPath),
      timeout,
      customMavenArgs,
    );
    debug('got call graph successfully');
    return callGraph;
  } catch (e) {
    debug('call graph error: ' + e);
    return {
      message: e.message,
      innerError: e.innerError || e,
    };
  }
}
