import * as path from 'path';
import * as test from 'tap-only';
import { legacyPlugin } from '@snyk/cli-interface';

import * as plugin from '../../lib';
import { readFixtureJSON } from '../helpers/read';
import { mockSnykSearchClient } from '../helpers/mock-search';

const testsPath = path.join(__dirname, '..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');

test('inspect on test-project pom', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    undefined,
    mockSnykSearchClient,
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
    mockSnykSearchClient,
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
    undefined,
    mockSnykSearchClient,
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
    undefined,
    mockSnykSearchClient,
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
    undefined,
    mockSnykSearchClient,
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
  const result = await plugin.inspect(
    testProjectPath,
    undefined,
    undefined,
    mockSnykSearchClient,
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

test('inspect on root that does not contain a pom.xml and no target file', async (t) => {
  try {
    await plugin.inspect(__dirname, undefined, undefined, mockSnykSearchClient);
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      t.match(
        err.message,
        'Child process failed with exit code: 1.',
        'should throw expected error with build failure message',
      );
      t.match(
        err.message,
        'there is no POM in this directory',
        'should throw expected error and mention no pom',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect on pom with plugin', async (t) => {
  try {
    await plugin.inspect(
      '.',
      path.join(fixturesPath, 'bad', 'pom.plugin.xml'),
      { dev: true },
      mockSnykSearchClient,
    );
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      t.match(
        err.message,
        'Cannot find dependency information.',
        'should throw expected error',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect on pom with bad dependency', async (t) => {
  try {
    await plugin.inspect(
      '.',
      path.join(fixturesPath, 'bad', 'pom.xml'),
      {
        dev: true,
      },
      mockSnykSearchClient,
    );
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      t.match(
        err.message,
        'BUILD FAILURE',
        'should throw expected error with build failure message',
      );
      t.match(
        err.message,
        'no.such.groupId:no.such.artifactId:jar:1.0.0',
        'should throw expected error and mention the bad dependency',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect on mvn error', async (t) => {
  const targetFile = path.join(fixturesPath, 'bad', 'pom.xml');
  const fullCommand = `mvn dependency:tree -DoutputType=dot --batch-mode --non-recursive --file="${targetFile}"`;
  try {
    await plugin.inspect(
      '.',
      targetFile,
      {
        dev: true,
      },
      mockSnykSearchClient,
    );
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      const expectedCommand =
        '\n\n' +
        'Please make sure that Apache Maven Dependency Plugin ' +
        'version 2.2 or above is installed, and that `' +
        fullCommand +
        '` executes successfully ' +
        'on this project.\n\n' +
        'If the problem persists, collect the output of `' +
        'DEBUG=* ' +
        fullCommand +
        '` and contact support@snyk.io\n';
      t.match(
        err.message,
        expectedCommand,
        'should throw expected error showing corresponding maven command',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect on mvnw error', async (t) => {
  const targetFile = path.join(fixturesPath, 'bad-maven-with-mvnw', 'pom.xml');
  try {
    await plugin.inspect(
      '.',
      targetFile,
      {
        dev: true,
      },
      mockSnykSearchClient,
    );
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      const expectedCommand =
        '[WARNING] The POM for no.such.groupId:no.such.artifactId:jar:1.0.0 is missing, no dependency information available';
      t.match(
        err.message,
        expectedCommand,
        'should throw expected error showing corresponding maven command',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect on mvnw is successful', async (t) => {
  const result = await plugin.inspect(
    path.join(fixturesPath, 'maven-with-mvnw'),
    undefined,
    undefined,
    mockSnykSearchClient,
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
    undefined,
    mockSnykSearchClient,
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

test('inspect on mvnw successful when resides in parent directory with targetFile', async (t) => {
  const result = await plugin.inspect(
    path.join(fixturesPath, 'wrapper-at-parent'),
    path.join(fixturesPath, 'wrapper-at-parent', 'project-a', 'pom.xml'),
    undefined,
    mockSnykSearchClient,
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

test('inspect on aggregate project root pom', async (t) => {
  const result = await plugin.inspect(
    path.join(fixturesPath, 'aggregate-project'),
    'pom.xml',
    undefined,
    mockSnykSearchClient,
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  t.same(
    result.package,
    {
      // root pom has no dependencies
      dependencies: {},
      name: 'io.snyk:my-app',
      packageFormatVersion: 'mvn:0.0.1',
      version: '1.2.3',
    },
    'should return expected result',
  );
});
