import * as path from 'path';
import * as test from 'tap-only';
import * as plugin from '../../lib';
import { legacyPlugin } from '@snyk/cli-interface';

const jarPath = path.join(__dirname, '..', 'fixtures', 'jars');

test('run inspect() on jar', async (t) => {
  const result = await plugin.inspect(jarPath, 'spring-core-5.1.8.RELEASE.jar');
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }

  t.ok(
    Object.keys(result.package.dependencies!).length > 0,
    'dependencies found',
  );

  t.equals(
    result.package.name,
    'jars:spring-core-5.1.8.RELEASE.jar',
    'correct project name',
  );

  t.equals(
    result.package.dependencies!['org.springframework:spring-core'].version,
    '5.1.8.RELEASE',
    'correct version found',
  );

  t.equals(
    result.package.dependencies!['org.springframework:spring-core']
      .dependencies!['org.springframework:spring-jcl'].version,
    '5.1.8.RELEASE',
    'correct sub dependency version found',
  );
});

test('run inspect() on full path jar', async (t) => {
  const result = await plugin.inspect(
    path.join(__dirname, '..'),
    path.join('fixtures', 'jars', 'spring-core-5.1.8.RELEASE.jar'),
  );
  if (legacyPlugin.isMultiResult(result)) {
    return t.fail('expected single inspect result');
  }
  t.equals(
    result.package.name,
    'fixtures.jars:spring-core-5.1.8.RELEASE.jar',
    'correct project name',
  );
});

test('run inspect() on altered jar', async (t) => {
  try {
    await plugin.inspect(jarPath, 'jackson-databind-2.9.9.jar');
    t.fail('Expected error');
  } catch (error) {
    t.match(
      error.message,
      'No package found for provided sha1 hash',
      'correct error message',
    );
  }
});

test('run inspect() on non-existent jar', async (t) => {
  try {
    await plugin.inspect(jarPath, 'nowhere-to-be-found-1.0.jar');
    t.fail('Expected error');
  } catch (error) {
    t.match(error.message, 'Unable to find jar at ', 'correct error message');
  }
});

test('run inspect() on user created jar (same as altered)', async (t) => {
  try {
    await plugin.inspect(jarPath, 'mvn-app-1.0-SNAPSHOT.jar');
    t.fail('Expected error');
  } catch (error) {
    t.match(
      error.message,
      'No package found for provided sha1 hash',
      'correct error message',
    );
  }
});
