import { legacyPlugin } from '@snyk/cli-interface';
import * as javaCallGraphBuilder from '@snyk/java-call-graph-builder';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import debugModule = require('debug');

import { parseTree, parseVersions } from './parse-mvn';
import * as subProcess from './sub-process';
import { containsJar, createPomForJar, createPomForJars, isJar } from './jar';
import { formatCallGraphError, formatGenericPluginError } from './error-format';
import {
  CallGraph,
  CallGraphResult,
  CallGraphError,
} from '@snyk/cli-interface/legacy/common';

// To enable debugging output, use `snyk -d`
let logger: debugModule.Debugger | null = null;
function debug(s: string) {
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

// When we have `mvn`, we can run the subProcess from anywhere.
// However due to https://github.com/takari/maven-wrapper/issues/133, `mvnw` can only be run
// within the directory where `mvnw` exists
function calculateTargetFilePath(mavenCommand, root: string, targetPath) {
  return mavenCommand === 'mvn' ? root : path.dirname(targetPath);
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

  // Mutate root and targetFile for when we have allProjects scenario.
  // This is needed so we invoke the wrapper from the same dir
  if (targetFile && targetFile.includes('/')) {
    root = path.dirname(targetPath);
    targetFile = path.basename(targetPath);
  }

  if (isJar(targetPath)) {
    debug(`Creating pom from jar ${targetFile}`);
    targetFile = await createPomForJar(root, targetFile!);
  }

  if (options.scanAllUnmanaged) {
    if (containsJar(root)) {
      debug(`Creating pom from jars in for ${root}`);
      targetFile = await createPomForJars(root);
    } else {
      throw Error(`Could not find any supported files in '${root}'.`);
    }
  }

  const mvnArgs = buildArgs(targetFile, options.args);
  const mavenCommand = getCommand(root, targetFile);
  const targetFilePath = calculateTargetFilePath(
    mavenCommand,
    root,
    targetPath,
  );
  try {
    const result = await subProcess.execute(mavenCommand, mvnArgs, {
      cwd: targetFilePath,
    });
    const versionResult = await subProcess.execute(
      `${mavenCommand} --version`,
      [],
      {
        cwd: targetFilePath,
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
    error.message = formatGenericPluginError(error, mavenCommand, mvnArgs);
    throw error;
  }
}

export function buildArgs(
  targetFile?: string,
  mavenArgs?: string[] | undefined,
) {
  // Requires Maven >= 2.2
  let args = ['dependency:tree', '-DoutputType=dot'];
  if (targetFile) {
    args.push('--file="' + targetFile + '"');
  }
  if (mavenArgs) {
    args = args.concat(mavenArgs);
  }
  return args;
}

async function getCallGraph(
  targetPath: string,
  timeout?: number,
): Promise<CallGraphResult> {
  debug(`getting call graph from path ${targetPath}`);
  if (timeout) {
    debug(`the timeout for call graph generation is ${timeout / 1000}s`);
  }
  try {
    const callGraph: CallGraph = await javaCallGraphBuilder.getCallGraphMvn(
      path.dirname(targetPath),
      timeout,
    );
    debug('got call graph successfully');
    return callGraph;
  } catch (e) {
    const userMessage = formatCallGraphError(e.message);
    debug('call graph error: ' + e);
    debug(userMessage);
    const err: CallGraphError = {
      message: userMessage,
      innerError: e,
    };
    return err;
  }
}
