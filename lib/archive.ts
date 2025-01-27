import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as glob from 'glob';
import * as debugLib from 'debug';
import { MavenPackage, SnykHttpClient } from './parse/types';
import { getMavenPackageInfo } from './search';

const debug = debugLib('snyk-mvn-plugin');

const ALGORITHM = 'sha1';
const DIGEST = 'hex';

function getSha1(buf: Buffer) {
  return crypto.createHash(ALGORITHM).update(buf).digest(DIGEST);
}

async function getMavenPackages(
  targetPath: string,
  snykHttpClient: SnykHttpClient,
): Promise<MavenPackage[]> {
  const contents = fs.readFileSync(targetPath);
  const sha1 = getSha1(contents);
  return getMavenPackageInfo(sha1, targetPath, snykHttpClient);
}

async function getDependencies(
  paths: string[],
  snykHttpClient: SnykHttpClient,
): Promise<MavenPackage[]> {
  let dependencies: MavenPackage[] = [];
  for (const p of paths) {
    try {
      const mavenPackages = await getMavenPackages(p, snykHttpClient);
      dependencies = dependencies.concat(mavenPackages);
    } catch (err) {
      // log error and continue with other paths
      if (err instanceof Error) {
        console.error(
          `Failed to get maven dependency for '${p}'.`,
          err.message,
        );
      }
    }
  }
  return dependencies;
}

export async function createDepGraphFromArchive(
  root: string,
  targetPath: string,
  snykHttpClient?: SnykHttpClient,
): Promise<DepGraph> {
  try {
    return await createDepGraphFromArchives(root, [targetPath], snykHttpClient);
  } catch (err) {
    const msg = `There was a problem generating a dep-graph for '${targetPath}'.`;
    debug(msg, err);
    if (err instanceof Error) {
      throw new Error(msg + ' ' + err.message);
    }
    throw new Error(msg);
  }
}

export async function createDepGraphFromArchives(
  root: string,
  archivePaths: string[],
  snykHttpClient?: SnykHttpClient,
): Promise<DepGraph> {
  if (!snykHttpClient) {
    throw new Error('No HTTP client provided!');
  }

  try {
    const dependencies = await getDependencies(archivePaths, snykHttpClient);
    if (!dependencies.length) {
      throw new Error(`No Maven artifacts found!`);
    }
    debug(`Creating dep-graph from ${JSON.stringify(dependencies)}`);
    const rootDependency = getRootDependency(root);
    const rootPkg = {
      name: `${rootDependency.groupId}:${rootDependency.artifactId}`,
      version: rootDependency.version,
    };
    const builder = new DepGraphBuilder({ name: 'maven' }, rootPkg);
    for (const dependency of dependencies) {
      const nodeId = `${dependency.groupId}:${dependency.artifactId}@${dependency.version}`;
      builder.addPkgNode(
        {
          name: `${dependency.groupId}:${dependency.artifactId}`,
          version: dependency.version,
        },
        nodeId,
      );
      builder.connectDep(builder.rootNodeId, nodeId);
    }
    const depGraph = builder.build();
    debug(`Created dep-graph ${JSON.stringify(depGraph.toJSON())}`);
    return depGraph;
  } catch (err) {
    const msg = `Detected supported file(s) in '${root}', but there was a problem generating a dep-graph.`;
    debug(msg, err);
    if (err instanceof Error) {
      throw new Error(msg + ' ' + err.message);
    }
    throw new Error(msg);
  }
}

export function isArchive(file: string): boolean {
  return !!file.match(/\.(([jwa]ar)|(zip))$/);
}

export function findArchives(targetPath: string): string[] {
  const stats = fs.statSync(targetPath);
  const dir = stats.isFile() ? path.dirname(targetPath) : targetPath;
  return glob.sync(`${dir}/**/*.@(jar|war|aar|zip)`);
}

function getRootDependency(root: string, targetFile?: string): MavenPackage {
  let groupId;
  if (targetFile) {
    groupId = path.dirname(targetFile);
    if (groupId === '.') {
      // we are in directory of the jar
      groupId = path.basename(path.resolve(root));
    }
  } else {
    // take root's parent directory base name
    groupId = path.basename(path.dirname(path.resolve(root)));
  }
  // replace path separators with dots
  groupId = groupId
    .replace(/\//g, '.') // *inx
    .replace(/\\/g, '.') // windows
    .replace(/^\./, ''); // remove any leading '.'
  return {
    groupId: groupId || 'root',
    artifactId: path.basename(targetFile || root) || 'root',
    version: '1.0.0',
  };
}
