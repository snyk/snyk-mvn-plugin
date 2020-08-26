import { legacyPlugin } from '@snyk/cli-interface';
import * as javaCallGraphBuilder from '@snyk/java-call-graph-builder';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

import { parseTree, parseVersions } from './parse-mvn';
import * as subProcess from './sub-process';
import { containsJar, createPomForJar, createPomForJars, isJar } from './jar';
import { formatGenericPluginError } from './error-format';
import { CallGraph, CallGraphResult } from '@snyk/cli-interface/legacy/common';
import debugModule = require('debug');

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

export function getCommand(
  root: string,
  targetFile: string | undefined,
): { command: string; location?: string } {
  if (!targetFile) {
    return { command: 'mvn' };
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
    return {
      command: wrapperScript,
      location: path.dirname(pathToWrapper),
    };
  }
  // now try to find a wrapper in the root
  pathToWrapper = path.resolve(root, wrapperScript);
  if (fs.existsSync(pathToWrapper)) {
    return {
      command: wrapperScript, //path.relative(path.dirname(path.resolve(root, targetFile)), pathToWrapper),
      location: root,
    };
  }
  return { command: 'mvn' };
}

// When we have `mvn`, we can run the subProcess from anywhere.
// However due to https://github.com/takari/maven-wrapper/issues/133, `mvnw` can only be run
// within the directory where `mvnw` exists
function calculateTargetFilePath(
  mavenCommand,
  root: string,
  targetPath: string,
) {
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
    mavenCommand.command,
    root,
    targetPath,
  );

  try {
    const result = await subProcess.execute(mavenCommand.command, mvnArgs, {
      cwd: mavenCommand.location || targetFilePath,
    });
    const versionResult = await subProcess.execute(
      `${mavenCommand.command} --version`,
      [],
      {
        cwd: mavenCommand.location || targetFilePath,
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
    error.message = formatGenericPluginError(
      error,
      mavenCommand.command,
      mvnArgs,
    );
    throw error;
  }
}

export function buildArgs(
  targetFile?: string,
  mavenArgs?: string[] | undefined,
): string[] {
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
  try {
    const callGraph: CallGraph = await javaCallGraphBuilder.getCallGraphMvn(
      path.dirname(targetPath),
      timeout,
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
