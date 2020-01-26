import { parseTree, parseVersions } from './parse-mvn';
import * as fs from 'fs';
import * as path from 'path';
import * as subProcess from './sub-process';
import { legacyPlugin } from '@snyk/cli-interface';
import { containsJar, createPomForJar, createPomForJars, isJar } from './jar';

export interface MavenOptions extends legacyPlugin.BaseInspectOptions {
  scanAllUnmanaged?: boolean;
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
    targetFile = await createPomForJar(root, targetFile!);
  }

  if (options.scanAllUnmanaged) {
    if (containsJar(root)) {
      targetFile = await createPomForJars(root);
    } else {
      throw Error(`Could not find any supported files in '${root}'.`);
    }
  }

  const mvnArgs = buildArgs(targetFile, options.args);
  try {
    const result = await subProcess.execute('mvn', mvnArgs, { cwd: root });
    const versionResult = await subProcess.execute('mvn --version', [], {
      cwd: root,
    });
    const parseResult = parseTree(result, options.dev);
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
      package: parseResult.data,
    };
  } catch (error) {
    error.message =
      error.message +
      '\n\n' +
      'Please make sure that Apache Maven Dependency Plugin ' +
      'version 2.2 or above is installed, and that ' +
      '`mvn ' +
      mvnArgs.join(' ') +
      '` executes successfully ' +
      'on this project.\n\n' +
      'If the problem persists, collect the output of ' +
      '`mvn ' +
      mvnArgs.join(' ') +
      '` and contact support@snyk.io\n';
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
