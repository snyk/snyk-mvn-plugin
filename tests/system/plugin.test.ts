import * as path from 'path';
import * as test from 'tap-only';
import { legacyPlugin } from '@snyk/cli-interface';
import * as os from 'os';

import * as plugin from '../../lib';
import { readFixtureJSON } from '../file-helper';

const testsPath = path.join(__dirname, '..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');

test('inspect on test-project pom', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('test-project', 'expected.json');
  // result.metadata depends on platform, so no fixture can be provided
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.javaVersion,
    'should contain javaVersion key',
  );
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.mavenVersion,
    'should contain mavenVersion key',
  );
  // therefore, only independent objects are compared
  delete result.plugin.meta;
  t.same(result, expected, 'should return expected result');
});

test('inspect on test-project pom with --dev', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      dev: true,
    },
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON(
    'test-project',
    'expected-with-dev.json',
  );
  // result.metadata depends on platform, so no fixture can be provided
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.javaVersion,
    'should contain javaVersion key',
  );
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.mavenVersion,
    'should contain mavenVersion key',
  );
  // therefore, only independent objects are compared
  delete result.plugin.meta;
  t.same(result, expected, 'should return expected result');
});

test('inspect on path with spaces pom', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(fixturesPath, 'path with spaces', 'pom.xml'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('path with spaces', 'expected.json');
  // result.metadata depends on platform, so no fixture can be provided
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.javaVersion,
    'should contain javaVersion key',
  );
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.mavenVersion,
    'should contain mavenVersion key',
  );
  // therefore, only independent objects are compared
  delete result.plugin.meta;
  t.same(result, expected, 'should return expected result');
});

test('inspect on relative path to test-project pom', async (t) => {
  const result = await plugin.inspect(
    __dirname,
    path.join('..', 'fixtures', 'test-project', 'pom.xml'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('test-project', 'expected.json');
  // result.metadata depends on platform, so no fixture can be provided
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.javaVersion,
    'should contain javaVersion key',
  );
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.mavenVersion,
    'should contain mavenVersion key',
  );
  // therefore, only independent objects are compared
  delete result.plugin.meta;
  t.same(result, expected, 'should return expected result');
});

test('inspect on relative path to test-project dir', async (t) => {
  const result = await plugin.inspect(
    __dirname,
    path.join('..', 'fixtures', 'test-project'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('test-project', 'expected.json');
  // result.metadata depends on platform, so no fixture can be provided
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.javaVersion,
    'should contain javaVersion key',
  );
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.mavenVersion,
    'should contain mavenVersion key',
  );
  // once checked, compare platform-independent properties only
  delete result.plugin.meta;
  t.same(result, expected, 'should return expected result');
});

test('inspect on root that contains pom.xml and no target file', async (t) => {
  const result = await plugin.inspect(testProjectPath);
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('test-project', 'expected.json');
  // result.metadata depends on platform, so no fixture can be provided
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.javaVersion,
    'should contain javaVersion key',
  );
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.mavenVersion,
    'should contain mavenVersion key',
  );
  // therefore, only independent objects are compared
  delete result.plugin.meta;
  t.same(result, expected, 'should return expected result');
});

test('inspect on root that does not contain a pom.xml and no target file', async (t) => {
  try {
    await plugin.inspect(__dirname);
    t.fail('expected inspect to throw error');
  } catch (error) {
    t.match(
      error.message,
      'BUILD FAILURE',
      'should throw expected error with build failure message',
    );
    t.match(
      error.message,
      'there is no POM in this directory',
      'should throw expected error and mention no pom',
    );
  }
});

test('inspect on pom with plugin', async (t) => {
  try {
    await plugin.inspect(
      '.',
      path.join(fixturesPath, 'bad', 'pom.plugin.xml'),
      { dev: true },
    );
    t.fail('expected inspect to throw error');
  } catch (error) {
    t.match(
      error.message,
      'Cannot find dependency information.',
      'should throw expected error',
    );
  }
});

test('inspect on pom with bad dependency', async (t) => {
  try {
    await plugin.inspect('.', path.join(fixturesPath, 'bad', 'pom.xml'), {
      dev: true,
    });
    t.fail('expected inspect to throw error');
  } catch (error) {
    t.match(
      error.message,
      'BUILD FAILURE',
      'should throw expected error with build failure message',
    );
    t.match(
      error.message,
      'no.such.groupId:no.such.artifactId:jar:1.0.0',
      'should throw expected error and mention the bad dependency',
    );
  }
});

test('inspect on mvnw with faulty pom unsuccessful', async (t) => {
  try {
    await plugin.inspect(path.join(fixturesPath, 'bad-maven-with-mvnw'));
    t.fail(`Shouldn't work with faulty pom`);
  } catch (e) {
    t.match(
      e.message,
      'The POM for no.such.groupId:no.such.artifactId:jar:1.0.0 is missing, no dependency information available',
      'Matched faulty pom title',
    );
    t.match(
      e.message,
      'If the problem persists, collect the output of `mvn dependency:tree -DoutputType=dot` and contact support@snyk.io',
      'Matched fauly pom cmd',
    );
  }
});

test('inspect on mvnw is successful', async (t) => {
  const result = await plugin.inspect(
    path.join(fixturesPath, 'maven-with-mvnw'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('maven-with-mvnw', 'expected.json');
  // result.metadata depends on platform, so no fixture can be provided
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.javaVersion,
    'should contain javaVersion key',
  );
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.mavenVersion,
    'should contain mavenVersion key',
  );
  // therefore, only independent objects are compared
  delete result.plugin.meta;
  t.same(result, expected, 'should return expected result');
});

test('inspect on mvnw is successful with targetFile', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(fixturesPath, 'maven-with-mvnw', 'pom.xml'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  const expected = await readFixtureJSON('maven-with-mvnw', 'expected.json');
  // result.metadata depends on platform, so no fixture can be provided
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.javaVersion,
    'should contain javaVersion key',
  );
  t.ok(
    result!.plugin!.meta!.versionBuildInfo!.metaBuildVersion!.mavenVersion,
    'should contain mavenVersion key',
  );
  // therefore, only independent objects are compared
  delete result.plugin.meta;
  t.same(result, expected, 'should return expected result');
});
