import * as path from 'path';
import * as test from 'tap-only';
import * as plugin from '../../lib';
import { legacyPlugin } from '@snyk/cli-interface';

test('run inspect()', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(__dirname, '..', 'fixtures', 'pom.xml'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  t.equals(
    result.package.dependencies!['axis:axis'].version,
    '1.4',
    'correct version found',
  );
  t.type(
    result.package.dependencies!['junit:junit'],
    'undefined',
    'no test deps',
  );
  t.end();
});

test('run inspect() on path with spaces', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(__dirname, '..', 'fixtures/path with spaces', 'pom.xml'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  t.equals(
    result.package.dependencies!['axis:axis'].version,
    '1.4',
    'correct version found',
  );
  t.type(
    result.package.dependencies!['junit:junit'],
    'undefined',
    'no test deps',
  );
  t.end();
});

test('run inspect() with --dev', async (t) => {
  const result = await plugin.inspect(
    '.',
    path.join(__dirname, '..', 'fixtures', 'pom.xml'),
    {
      dev: true,
    },
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  t.equals(
    result.package.dependencies!['axis:axis'].version,
    '1.4',
    'correct version found',
  );
  t.equals(
    result.package.dependencies!['junit:junit'].version,
    '4.10',
    'test deps found',
  );
});

test('run inspect() with a bad dependency plugin', async (t) => {
  try {
    await plugin.inspect(
      '.',
      path.join(__dirname, '..', 'fixtures', 'pom.dep-plugin.xml'),
      { dev: true },
    );
    t.fail('bad dependency plugin - we should not be here');
  } catch (error) {
    t.match(
      error.message,
      'Cannot find dependency information.',
      'proper error message',
    );
    t.end();
  }
});

test('run inspect() with a bad pom.xml', async (t) => {
  try {
    await plugin.inspect(
      '.',
      path.join(__dirname, '..', 'fixtures', 'bad-pom.xml'),
      {
        dev: true,
      },
    );
    t.fail('bad pom.xml - should have thrown!');
  } catch (error) {
    t.match(
      error.message,
      'executes successfully on this project',
      'proper error message',
    );
    t.end();
  }
});
