import * as test from 'tap-only';
import { readFixture, readFixtureJSON } from '../file-helper';
import { parseTree, parseVersions } from '../../lib/parse-mvn';

test('parseTree without --dev', async (t) => {
  const mavenOutput = await readFixture(
    'parse-mvn/maven-dependency-tree-output.txt',
  );
  const depTree = parseTree(mavenOutput, false);
  const results = await readFixtureJSON('parse-mvn/maven-parse-results.json');
  t.same(depTree.data, results, 'should return expected results');
});

test('parseTree with --dev', async (t) => {
  const mavenOutput = await readFixture(
    'parse-mvn/maven-dependency-tree-output.txt',
  );
  const depTree = parseTree(mavenOutput, true);
  const results = await readFixtureJSON(
    'parse-mvn/maven-parse-dev-results.json',
  );
  t.same(depTree.data, results, 'should return expected results');
});

test('parseTree with bad mvn dependency:tree output', async (t) => {
  const mavenOutput = await readFixture(
    'parse-mvn/maven-dependency-tree-bad.txt',
  );
  try {
    parseTree(mavenOutput, true);
    t.fail('expected parseTree to throw error');
  } catch (error) {
    t.equals(
      error.message,
      'Cannot find dependency information.',
      'should throw expected error',
    );
  }
});

test('parseTree with error mvn dependency:tree output', async (t) => {
  const mavenOutput = await readFixture(
    'parse-mvn/maven-dependency-tree-error.txt',
  );
  try {
    parseTree(mavenOutput, true);
    t.fail('expected parseTree to throw error');
  } catch (error) {
    t.equals(
      error.message,
      'Failed to execute an `mvn` command.',
      'should throw expected error',
    );
  }
});

test('parseTree with type "test-jar" in mvn dependency', async (t) => {
  const mavenOutput = await readFixture(
    'parse-mvn/maven-dependency-tree-with-type.txt',
  );
  const result = parseTree(mavenOutput, true);
  if (result && result.data && result.data.dependencies) {
    t.equals(
      result.data.dependencies['com.snyk.tester:tester-queue'].version,
      '15.0.0',
    );
  } else {
    t.fail('result.data.dependencies was empty');
  }
});

test('parseVersions from mvn --version', async (t) => {
  const mavenOutput = await readFixture('parse-mvn/maven-versions.txt');
  const result = parseVersions(mavenOutput);
  if (result) {
    t.equals(
      result.javaVersion,
      'Java version: 12.0.1, vendor: Oracle Corporation, runtime: /Library/Java/JavaVirtualMachines/openjdk-12.0.1.jdk/Contents/Home',
    );
    t.equals(
      result.mavenVersion,
      'Apache Maven 3.6.2 (40f52333136460af0dc0d7232c0dc0bcf0d9e117; 2019-08-27T17:06:16+02:00)',
    );
  } else {
    t.fail('result.data.dependencies was empty');
  }
});
