import * as path from 'path';
import * as crypto from 'crypto';
import * as fs from 'fs';

// Using the maven-central sha1 checksum API call (see: https://search.maven.org/classic/#api)
const ALGORITHM = crypto.createHash('sha1');
const DIGEST = 'hex';

export function getTempPomPathForJar(root: string, jar: string): string {
  const jarPath = path.join(root, jar);
  if (!fs.existsSync(jarPath)) {
    throw new Error('File not found at ' + jarPath);
  }

  const fileContents = fs.readFileSync(jarPath);
  const sha1 = getSha1ForJar(fileContents);

  // return path to root of pom.xml
  return '';
}

export function isJar(file: string) {
  return file.match(/\.(([jw]ar)|(zip))$/);
}

export function getSha1ForJar(fileContents) {
  return ALGORITHM.update(fileContents).digest(DIGEST);
}
