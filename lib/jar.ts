import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as needle from 'needle';
import { getPomContents, MavenDependency } from './pom';

import * as tmp from 'tmp';
tmp.setGracefulCleanup();

import debugLib = require('debug');
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
      console.error(`Failed to get maven dependency for '${p}'.`, err.message);
    }
  }
  return dependencies;
}

export async function createPomForJar(
  root: string,
  targetFile: string,
): Promise<string> {
  const targetPath = path.resolve(root, targetFile);
  try {
    const dependency = await getMavenDependency(targetPath);
    debug(`Creating pom.xml for ${JSON.stringify(dependency)}`);
    const rootDependency = getRootDependency(root, targetFile);
    const pomContents = getPomContents([dependency], rootDependency);
    const pomFile = createTempPomFile(targetPath, pomContents);
    return pomFile;
  } catch (err) {
    const msg = `There was a problem generating a pom file for jar ${targetPath}.`;
    debug(msg, err);
    throw new Error(msg + ' ' + err.message);
  }
}

export async function createPomForJars(root: string): Promise<string> {
  try {
    const jarPaths = fs
      .readdirSync(root)
      .filter(isJar)
      .map((jar) => path.join(root, jar));
    const dependencies = await getDependencies(jarPaths);
    debug(`Creating pom.xml for ${JSON.stringify(dependencies)}`);
    const rootDependency = getRootDependency(root);
    const pomContents = getPomContents(dependencies, rootDependency);
    const pomFile = createTempPomFile(root, pomContents);
    return pomFile;
  } catch (err) {
    const msg = `Detected jar file(s) in: '${root}', but there was a problem generating a pom file.`;
    debug(msg, err);
    throw new Error(msg + ' ' + err.message);
  }
}

export function isJar(file: string): boolean {
  return !!file.match(/\.(([jw]ar)|(zip))$/);
}

export function containsJar(targetPath: string): boolean {
  const stats = fs.statSync(targetPath);
  if (stats.isFile()) {
    // look in files directory
    const dir = path.dirname(targetPath);
    return fs.readdirSync(dir).some(isJar);
  }
  if (stats.isDirectory()) {
    return fs.readdirSync(targetPath).some(isJar);
  }
  return false;
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

function createTempPomFile(filePath: string, pomContents: string): string {
  try {
    const tmpPom = tmp.fileSync({
      postfix: '-pom.xml',
      dir: path.resolve(path.dirname(filePath)),
    });
    fs.writeFileSync(tmpPom.name, pomContents);
    return tmpPom.name;
  } catch (err) {
    throw new Error('Failed to create temporary pom. ' + err.message);
  }
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
  // replace path seperators with dots
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
