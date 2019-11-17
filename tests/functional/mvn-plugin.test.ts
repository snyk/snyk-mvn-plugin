import * as test from 'tap-only';
import * as plugin from '../../lib';

test('check build args with array', (t) => {
  const result = plugin.buildArgs(null, null, ['-Paxis', '-Pjaxen']);
  t.deepEquals(result, [
    'dependency:tree',
    '-DoutputType=dot',
    '-Paxis',
    '-Pjaxen',
  ]);
  t.end();
});

test('check build args with string', (t) => {
  const result = plugin.buildArgs(null, null, '-Paxis -Pjaxen');
  t.deepEqual(result, [
    'dependency:tree',
    '-DoutputType=dot',
    '-Paxis -Pjaxen',
  ]);
  t.end();
});
