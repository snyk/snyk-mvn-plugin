import * as test from 'tap-only';
import * as plugin from '../../lib';

test('buildArgs with array', async (t) => {
  const result = plugin.buildArgs('.', '.', undefined, ['-Paxis', '-Pjaxen']);
  t.same(
    result,
    ['dependency:tree', '-DoutputType=dot', '-Paxis', '-Pjaxen'],
    'should return expected array',
  );
});
