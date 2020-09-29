import * as test from 'tap-only';
import * as path from 'path';
import { findJars, isJar } from '../../lib/jar';

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
const nestedJarsPath = path.join(fixturesPath, 'nested-jars');

test('findJars', async (t) => {
  [
    { dir: springCorePath, expectedNumOfJars: 1 },
    { dir: badPath, expectedNumOfJars: 2 },
    { dir: fixturesPath, expectedNumOfJars: 0 },
    { dir: dummyPath, expectedNumOfJars: 0 },
    { dir: nestedJarsPath, expectedNumOfJars: 1 },
    { dir: nestedJarsPath, expectedNumOfJars: 2, recursive: true },
  ]
    .forEach(({ dir, expectedNumOfJars , recursive }) =>
      t.same(findJars(dir, recursive).length, expectedNumOfJars, `should find ${expectedNumOfJars} jars for "${path.basename(dir)}" ${recursive ? "(recursive)" : ""}`)
    );
  }
);
