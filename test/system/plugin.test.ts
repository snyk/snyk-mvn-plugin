let path = require('path');
let test = require('tap-only');
let plugin = require('../../lib');

test('run inspect()', (t) => {
  t.plan(2);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures', 'pom.xml'))
    .then((result) => {
      t.equal(result.package.dependencies['axis:axis'].version, '1.4',
        'correct version found');
      t.type(result.package.dependencies['junit:junit'], 'undefined',
        'no test deps');
    });
});

test('run inspect() on path with spaces', (t) => {
  t.plan(2);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures/path with spaces', 'pom.xml'))
    .then((result) => {
      t.equal(result.package.dependencies['axis:axis'].version, '1.4',
        'correct version found');
      t.type(result.package.dependencies['junit:junit'], 'undefined',
        'no test deps');
    });
});

test('run inspect() with --dev', (t) => {
  t.plan(2);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures', 'pom.xml'), {dev: true})
    .then((result) => {
      t.equal(result.package.dependencies['axis:axis'].version, '1.4',
        'correct version found');
      t.equal(result.package.dependencies['junit:junit'].version, '4.10',
        'test deps found');
    });
});

test('run inspect() with a bad dependency plugin', (t) => {
  t.plan(1);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures', 'pom.dep-plugin.xml'), {dev: true})
    .then(() => {
      t.fail('bad dependency plugin - we should not be here');
    })
    .catch((error) => {
      t.match(error.message, 'Cannot find dependency information.',
        'proper error message');
    });
});

test('run inspect() with a bad pom.xml', (t) => {
  t.plan(1);
  return plugin.inspect('.', path.join(
    __dirname, '..', 'fixtures', 'bad-pom.xml'), {dev: true})
    .then(() => {
      t.fail('bad pom.xml - should have thrown!');
    })
    .catch((error) => {
      t.match(error.message, 'executes successfully on this project',
        'proper error message');
    });
});
