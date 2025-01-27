import * as path from 'path';
import { findArchives, isArchive } from '../../../lib/archive';

test('isArchive', async () => {
  [
    'mvn-app-1.0-SNAPSHOT.jar',
    'mvn-app-1.0-SNAPSHOT.war',
    'mvn-app-1.0-SNAPSHOT.zip',
    'path/to/mvn-app-1.0-SNAPSHOT.jar',
    'path/to/mvn-app-1.0-SNAPSHOT.war',
    'path/to/mvn-app-1.0-SNAPSHOT.zip',
  ].forEach((i) => expect(isArchive(i)).toBeTruthy());

  [
    'mvn-app-1.0-SNAPSHOTjar',
    'mvn-app-1.0-SNAPSHOT.txt',
    'mvn-app-1.0-SNAPSHOT.jzip',
    'path/to/jar/mvn-app-1.0-SNAPSHOTjar',
    'path/to/war/mvn-app-1.0-SNAPSHOTwar',
    'path/to/zip/mvn-app-1.0-SNAPSHOTzip',
  ].forEach((i) => expect(isArchive(i)).toBeFalsy());
});

const fixturesPath = path.join(__dirname, '../..', 'fixtures');
const springCorePath = path.join(fixturesPath, 'spring-core');
const badPath = path.join(fixturesPath, 'bad');
const dummyPath = path.join(fixturesPath, 'dummy');
const nestedJarsPath = path.join(fixturesPath, 'nested-jars');
const nestedWarsAarsPath = path.join(fixturesPath, 'nested-wars-aars');

test('findArchives', async () => {
  [
    { dir: springCorePath, expectedNumOfJars: 1 },
    { dir: badPath, expectedNumOfJars: 2 },
    { dir: fixturesPath, expectedNumOfJars: 14 },
    { dir: dummyPath, expectedNumOfJars: 0 },
    { dir: nestedJarsPath, expectedNumOfJars: 2 },
    { dir: nestedWarsAarsPath, expectedNumOfJars: 2 },
  ].forEach(({ dir, expectedNumOfJars }) =>
    expect(findArchives(dir).length).toEqual(expectedNumOfJars));
});
