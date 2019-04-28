import * as fs from 'fs';
import * as path from 'path';
import * as test from 'tap-only';
import {parseTree} from '../../lib/parse-mvn';

test('compare full results - without --dev', (t) => {
  t.plan(1);
  const mavenOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'maven-dependency-tree-output.txt'), 'utf8');
  const depTree = parseTree(mavenOutput, false);
  const results = require(path.join(
    __dirname, '..', 'fixtures', 'maven-parse-results.json'));

  t.same(depTree.data, results);
});

test('compare full results - with --dev', (t)=> {
  t.plan(1);
  const mavenOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'maven-dependency-tree-output.txt'), 'utf8');
  const depTree = parseTree(mavenOutput, true);
  const results = require(path.join(
    __dirname, '..', 'fixtures', 'maven-parse-dev-results.json'));

  t.same(depTree.data, results);
});

test('test with bad mvn dependency:tree output', (t) => {
  t.plan(1);
  const mavenOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'maven-dependency-tree-bad.txt'), 'utf8');
  try {
    parseTree(mavenOutput, true);
    t.fail('Should have thrown!');
  } catch (error) {
    t.equal(error.message, 'Cannot find dependency information.',
      'proper error message');
  }
});

test('test with error mvn dependency:tree output', (t) => {
  t.plan(1);
  const mavenOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures', 'maven-dependency-tree-error.txt'), 'utf8');
  try {
    parseTree(mavenOutput, true);
    t.fail('Should have thrown!');
  } catch (error) {
    t.equal(error.message, 'Failed to execute an `mvn` command.',
      'proper error message');
  }
});

test('test with type "test-jar" in mvn dependency', (t) => {
  t.plan(1);
  const mavenOutput = fs.readFileSync(path.join(
    __dirname, '..', 'fixtures',
    'maven-dependency-tree-with-type.txt'), 'utf8');
  const result = parseTree(mavenOutput, true);
  if (result && result.data && result.data.dependencies) {
    t.equal(result.data.dependencies['com.snyk.tester:tester-queue'].version,
      '15.0.0');
  } else {
    t.fail('Should have passed!');
  }
});
