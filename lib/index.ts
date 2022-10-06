import { legacyPlugin } from '@snyk/cli-interface';
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
import debugModule = require('debug');
import { parse } from './parse';

const WRAPPERS = ['mvnw', 'mvnw.cmd'];
// To enable debugging output, use `snyk -d`
let logger: debugModule.Debugger | null = null;

export function debug(...messages: string[]) {
  if (logger === null) {
    // Lazy init: Snyk CLI needs to process the CLI argument "-d" first.
    // TODO(BST-648): more robust handling of the debug settings
    if (process.env.DEBUG) {
      debugModule.enable(process.env.DEBUG);
    }
    logger = debugModule('snyk-mvn-plugin');
  }
  messages.forEach((m) => logger(m));
}

export interface MavenOptions extends legacyPlugin.BaseInspectOptions {
  scanAllUnmanaged?: boolean;
  allProjects?: boolean;
  mavenAggregateProject?: boolean;
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
    options.mavenAggregateProject,
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
    let parseResult = {};
    if (options.mavenAggregateProject) {
      parseResult = parse(result);
    } else {
      parseResult = parseTree(result, options.dev);
    }
    const { javaVersion, mavenVersion } = parseVersions(versionResult);
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
        },
      },
      ...parseResult,
    };
  } catch (err) {
    if (result) debug(`>>> Output from mvn: ${result}`);
    if (err instanceof Error) {
      const msg = formatGenericPluginError(err, mavenCommand, mvnArgs);
      throw new Error(msg);
    }
    throw err;
  }
}

export function buildArgs(
  rootPath: string,
  executionPath: string,
  targetFile?: string,
  mavenArgs?: string[] | undefined,
  mavenAggregateProject = false,
) {
  let args: string[] = [];

  if (mavenAggregateProject) {
    // to workaround an issue in maven-dependency-tree plugin
    // when unpublished artifacts do not exist in either a local or remote repository
    // see https://stackoverflow.com/questions/1677473/maven-doesnt-recognize-sibling-modules-when-running-mvn-dependencytree
    args = args.concat('test-compile');
  }

  // Requires Maven >= 2.2
  args = args.concat([
    'dependency:tree', // use dependency plugin to display a tree of dependencies
    '-DoutputType=dot', // use 'dot' output format
    '--batch-mode', // clean up output, disables output color and download progress
  ]);

  if (!mavenAggregateProject) {
    args = args.concat('--non-recursive'); // do not include modules unless performing aggregate project scan
  }

  if (targetFile && !mavenAggregateProject) {
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
