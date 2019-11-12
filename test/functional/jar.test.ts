import * as  test from 'tap-only';
import * as path from 'path';
import * as fs from 'fs';
import {getSha1ForJar, isJar} from '../../lib/jar';

test('detects jar files', (t) => {
  const jarPaths = [
    'mvn-app-1.0-SNAPSHOT.jar',
    'mvn-app-1.0-SNAPSHOT.war',
    'mvn-app-1.0-SNAPSHOT.zip'];
  for (const path of jarPaths) {
    t.ok(isJar(path), path);
  }
  t.end();
});

test('ignores non jar files', (t) => {
  const jarPaths = [
    'mvn-app-1.0-SNAPSHOTjar',
    'mvn-app-1.0-SNAPSHOT.txt',
    'mvn-app-1.0-SNAPSHOT.jzip'];
  for (const path of jarPaths) {
    t.ok(!isJar(path), path);
  }
  t.end();
});

test('returns correct sha1 for jar file', (t) => {
  const fileContents = fs.readFileSync(path.join(__dirname, '..', 'fixtures/jars', 'jackson-databind-2.9.9.jar'));
  const sha1 = getSha1ForJar(fileContents);
  t.equals(sha1, 'd6eb9817d9c7289a91f043ac5ee02a6b3cc86238', 'correct sha1');
  t.end();
});
