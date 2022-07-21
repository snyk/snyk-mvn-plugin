import { DepGraph, DepGraphBuilder } from '@snyk/dep-graph';
import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as glob from 'glob';
import * as needle from 'needle';
import * as debugLib from 'debug';

const debug = debugLib('snyk-mvn-plugin');

// Using the maven-central sha1 checksum API call (see: https://search.maven.org/classic/#api)
const MAVEN_SEARCH_URL =
  process.env.MAVEN_SEARCH_URL || 'https://search.maven.org/solrsearch/select';
const ALGORITHM = 'sha1';
const DIGEST = 'hex';

interface MavenCentralResponse {
  response: {
    docs: MavenPackageInfo[];
  };
}

interface MavenPackageInfo {
  g: string; // group
  a: string; // artifact
  v: string; // version
}

interface MavenDependency {
  groupId: string;
  artifactId: string;
  version: string;
}

function getSha1(buf: Buffer) {
  return crypto
    .createHash(ALGORITHM)
    .update(buf)
    .digest(DIGEST);
}

async function getMavenDependency(
  targetPath: string,
): Promise<MavenDependency> {
  const contents = fs.readFileSync(targetPath);
  const sha1 = getSha1(contents);
  const { g, a, v } = await getMavenPackageInfo(sha1, targetPath);
  return {
    groupId: g,
    artifactId: a,
    version: v,
  };
}

async function getDependencies(paths: string[]): Promise<MavenDependency[]> {
  const dependencies: MavenDependency[] = [];
  for (const p of paths) {
    try {
      const dependency = await getMavenDependency(p);
      dependencies.push(dependency);
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
): Promise<DepGraph> {
  try {
    return await createDepGraphFromArchives(root, [targetPath]);
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
): Promise<DepGraph> {
  try {
    const dependencies = await getDependencies(archivePaths);
    if (!dependencies.length) {
      throw new Error(
        `No Maven artifacts found when searching ${MAVEN_SEARCH_URL}`,
      );
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

export function findArchives(targetPath: string, recursive = false): string[] {
  const stats = fs.statSync(targetPath);
  const dir = stats.isFile() ? path.dirname(targetPath) : targetPath;
  return glob.sync(`${dir}/${recursive ? '**/' : ''}*.@(jar|war|aar|zip)`);
}

async function getMavenPackageInfo(
  sha1: string,
  targetPath: string,
): Promise<MavenPackageInfo> {
  const url = `${MAVEN_SEARCH_URL}?q=1:"${sha1}"&wt=json`;
  return new Promise((resolve, reject) => {
    needle.request(
      'get',
      url,
      {},
      { json: true },
      (err, fullRes, res: MavenCentralResponse) => {
        if (err) {
          reject(err);
        }
        if (!res || !res.response || res.response.docs.length === 0) {
          reject(
            new Error(
              `No package found querying '${MAVEN_SEARCH_URL}' for sha1 hash '${sha1}'.`,
            ),
          );
        }
        if (res.response.docs.length > 1) {
          const sha1Target = path.parse(targetPath).base;
          debug('Got multiple results for sha1, looking for', sha1Target);
          const foundPackage = res.response.docs.find(({ g }) =>
            sha1Target.includes(g),
          );
          res.response.docs = [foundPackage || res.response.docs[0]];
        }
        resolve(res.response.docs[0]);
      },
    );
  });
}

function getRootDependency(root: string, targetFile?: string): MavenDependency {
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
