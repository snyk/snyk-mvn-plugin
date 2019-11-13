import {parseTree} from './parse-mvn';
import * as fs from 'fs';
import * as path from 'path';
import * as subProcess from './sub-process';
import { legacyPlugin } from '@snyk/cli-interface';

export async function inspect(
  root: string,
  targetFile: string,
  options: legacyPlugin.InspectOptions,
): Promise<legacyPlugin.InspectResult> {

  if (!options) {
    options = {dev: false};
  }

  const mvnArgs = buildArgs(root, targetFile, options.args);
  try {
    const result = await subProcess.execute('mvn', mvnArgs, {cwd: root});
    const parseResult = parseTree(result, options.dev);
    return {
      plugin: {
        name: 'bundled:maven',
        runtime: 'unknown',
      },
      package: parseResult.data,
    };
  } catch (error) {
    error.message = error.message + '\n\n' +
      'Please make sure that Apache Maven Dependency Plugin ' +
      'version 2.2 or above is installed, and that ' +
      '`mvn ' + mvnArgs.join(' ') + '` executes successfully ' +
      'on this project.\n\n' +
      'If the problem persists, collect the output of ' +
      '`mvn ' + mvnArgs.join(' ') + '` and contact support@snyk.io\n';
    throw error;
  }
}

export function buildArgs(root, targetFile, mavenArgs) {
  // Requires Maven >= 2.2
  let args = ['dependency:tree', '-DoutputType=dot'];
  if (targetFile) {
    if (!fs.existsSync(path.resolve(root, targetFile))) {
      throw new Error('File not found: "' + targetFile + '"');
    }
    args.push('--file="' + targetFile + '"');
  }
  if (mavenArgs) {
    args = args.concat(mavenArgs);
  }
  return args;
}
