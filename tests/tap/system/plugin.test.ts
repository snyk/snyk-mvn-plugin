import * as path from 'path';
import * as test from 'tap-only';
import { legacyPlugin } from '@snyk/cli-interface';

import * as plugin from '../../../lib';
import { readFixtureJSON } from '../../helpers/read';
import * as depGraphLib from '@snyk/dep-graph';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');
const verboseProjectPath = path.join(fixturesPath, 'verbose-project');

test('inspect on test-project pom', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on test-project pom with --dev', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      dev: true,
    },
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-dep-graph-with-dev.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on path with spaces pom', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(fixturesPath, 'path with spaces', 'pom.xml'),
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'path with spaces',
    'expected-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on relative path to test-project pom', async (t) => {
  const result = await plugin.inspect(
    __dirname,
    path.join('../..', 'fixtures', 'test-project', 'pom.xml'),
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on relative path to test-project dir', async (t) => {
  const result = await plugin.inspect(
    __dirname,
    path.join('../..', 'fixtures', 'test-project'),
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on root that contains pom.xml and no target file', async (t) => {
  const result = await plugin.inspect(testProjectPath);
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on root that does not contain a pom.xml and no target file', async (t) => {
  try {
    await plugin.inspect(__dirname);
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

test('inspect on pom with dependency plugin version less than 2.2', async (t) => {
  try {
    await plugin.inspect(
      '.',
      path.join(fixturesPath, 'bad', 'pom.plugin.xml'),
      { dev: true },
    );
    t.fail('expected inspect to throw error');
  } catch (err) {
    if (err instanceof Error) {
      t.match(
        err.message,
        'Please make sure that Apache Maven Dependency Plugin version 2.2 or above',
        'should throw expected error',
      );
    } else {
      t.fail('error is not instance of Error');
    }
  }
});

test('inspect on pom with bad dependency using maven 3.5.4', async (t) => {
  try {
    await plugin.inspect('.', path.join(fixturesPath, 'bad', 'pom.xml'), {
      dev: true,
    });
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

test('inspect on pom that logs an error but succeeds', async (t) => {
  const result = await plugin.inspect(
    __dirname,
    path.join(
      '../..',
      'fixtures',
      'successful-build-with-error-log',
      'pom.xml',
    ),
    {},
  );

  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }

  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'successful-build-with-error-log',
    'expected-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  console.log(JSON.stringify(result.scannedProjects[0].depGraph));
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on mvn error', async (t) => {
  const targetFile = path.join(fixturesPath, 'bad', 'pom.xml');
  const fullCommand = `mvn dependency:tree -DoutputType=dot --batch-mode --non-recursive --file="${targetFile}"`;
  try {
    await plugin.inspect('.', targetFile, {
      dev: true,
    });
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
    await plugin.inspect('.', targetFile, {
      dev: true,
    });
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
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on mvnw is successful with targetFile', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(fixturesPath, 'maven-with-mvnw', 'pom.xml'),
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on mvnw successful when resides in parent directory with targetFile', async (t) => {
  const result = await plugin.inspect(
    path.join(fixturesPath, 'wrapper-at-parent'),
    path.join(fixturesPath, 'wrapper-at-parent', 'project-a', 'pom.xml'),
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.ok(
    result.scannedProjects[0].depGraph?.equals(expectedDepGraph),
    'returns expected dep-graph',
  );
});

test('inspect on aggregate project root pom', async (t) => {
  const result = await plugin.inspect(
    path.join(fixturesPath, 'aggregate-project'),
    'pom.xml',
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  t.same(
    result.scannedProjects[0].depGraph?.rootPkg,
    { name: 'io.snyk:my-app', version: '1.2.3' },
    'has expected root pkg',
  );
  t.equal(
    result.scannedProjects[0].depGraph?.getDepPkgs().length,
    0,
    'root has 0 dependencies',
  );
});

test('inspect on test-project pom using -Dverbose', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      args: ['-Dverbose'],
    },
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-verbose-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.same(
    result.scannedProjects[0].depGraph?.toJSON(),
    expectedDepGraph.toJSON(),
    'returns expected dep-graph',
  );
});

test('inspect on verbose-project pom using -Dverbose', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(verboseProjectPath, 'pom.xml'),
    {
      args: ['-Dverbose'],
    },
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'verbose-project',
    'expected-verbose-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.same(
    result.scannedProjects[0].depGraph?.toJSON(),
    expectedDepGraph.toJSON(),
    'returns expected dep-graph',
  );
});

test('inspect on test-project pom using --unpruned', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      unpruned: true,
    },
  );
  if (!legacyPlugin.isMultiResult(result)) {
    return t.fail('expected multi inspect result');
  }
  t.equal(result.scannedProjects.length, 1, 'returns 1 scanned project');
  const expectedJSON = await readFixtureJSON(
    'test-project',
    'expected-verbose-dep-graph.json',
  );
  const expectedDepGraph = depGraphLib.createFromJSON(expectedJSON);
  t.same(
    result.scannedProjects[0].depGraph?.toJSON(),
    expectedDepGraph.toJSON(),
    'returns expected dep-graph',
  );
});
