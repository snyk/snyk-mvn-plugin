import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as request from 'request-promise-native';
import { createPom } from './pom';

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

export async function getTempPomPathForJar(
  root: string,
  jarName: string,
): Promise<string> {
  const jarPath = path.resolve(root, jarName);

  try {
    if (!fs.existsSync(jarPath)) {
      throw new Error('Unable to find jar at ' + jarPath);
    }

    const fileContents = fs.readFileSync(jarPath);

    const sha1 = crypto
      .createHash(ALGORITHM)
      .update(fileContents)
      .digest(DIGEST);

    const { a, g, v } = await getMavenPackageInfo(sha1);
    const pomText = createPom(
      {
        groupId: g,
        artifactId: a,
        version: v,
      },
      jarName,
    );
    return createTempPomFile(jarPath, pomText);
  } catch (error) {
    debug(
      `Unable to generate dummy pom file for provided jar at path: ${jarPath}`,
      error,
    );
    throw new Error(
      'Failed to generate dummy pom.xml for provided jar: ' + error.message,
    );
  }
}

export function isJar(file: string) {
  return file.match(/\.(([jw]ar)|(zip))$/);
}

async function getMavenPackageInfo(sha1: string): Promise<MavenPackageInfo> {
  const res: MavenCentralResponse = await request({
    url: MAVEN_SEARCH_URL,
    qs: {
      wt: 'json',
      q: `1:"${sha1}"`,
    },
    json: true,
  });

  if (!res || !res.response || res.response.docs.length === 0) {
    throw new Error('No package found for provided sha1 hash');
  }

  if (res.response.docs.length > 1) {
    debug('Got multiple results for sha1, only returning first one');
  }

  return res.response.docs[0];
}

async function createTempPomFile(
  filePath: string,
  pomContents: string,
): Promise<string> {
  try {
    const tmpPom = tmp.fileSync({
      postfix: '-pom.xml',
      dir: path.resolve(path.dirname(filePath)),
    });
    await fs.writeFileSync(tmpPom.name, pomContents);
    return tmpPom.name;
  } catch (error) {
    error.message =
      error.message + '\n\n' + 'Failed to create a temporary pom file.';
    throw error;
  }
}
