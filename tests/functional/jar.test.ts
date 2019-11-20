import * as test from 'tap-only';
import * as path from 'path';
import { containsJar, isJar } from '../../lib/jar';

test('isJar', async (t) => {
  [
    'mvn-app-1.0-SNAPSHOT.jar',
    'mvn-app-1.0-SNAPSHOT.war',
    'mvn-app-1.0-SNAPSHOT.zip',
    'path/to/mvn-app-1.0-SNAPSHOT.jar',
    'path/to/mvn-app-1.0-SNAPSHOT.war',
    'path/to/mvn-app-1.0-SNAPSHOT.zip',
  ].forEach((i) => t.ok(isJar(i), 'should be true for ' + i));

  [
    'mvn-app-1.0-SNAPSHOTjar',
    'mvn-app-1.0-SNAPSHOT.txt',
    'mvn-app-1.0-SNAPSHOT.jzip',
    'path/to/jar/mvn-app-1.0-SNAPSHOTjar',
    'path/to/war/mvn-app-1.0-SNAPSHOTwar',
    'path/to/zip/mvn-app-1.0-SNAPSHOTzip',
  ].forEach((i) => t.notOk(isJar(i), 'should be false for ' + i));
});

const fixturesPath = path.join(__dirname, '..', 'fixtures');
const springCorePath = path.join(fixturesPath, 'spring-core');
const badPath = path.join(fixturesPath, 'bad');
const dummyPath = path.join(fixturesPath, 'dummy');

test('containsJar', async (t) => {
  [springCorePath, badPath].forEach((i) =>
    t.ok(containsJar(i), 'should be true for ' + path.basename(i)),
  );

  [fixturesPath, dummyPath].forEach((i) =>
    t.notOk(containsJar(i), 'should be false for ' + path.basename(i)),
  );
});
