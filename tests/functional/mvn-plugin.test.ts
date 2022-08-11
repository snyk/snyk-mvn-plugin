import * as test from 'tap-only';
import * as plugin from '../../lib';

test('buildArgs with array', async (t) => {
  const result = plugin.buildArgs('.', '.', undefined, ['-Paxis', '-Pjaxen']);
  t.same(
    result,
    [
      'dependency:tree',
      '-DoutputType=dot',
      '--batch-mode',
      '--non-recursive',
      '-Paxis',
      '-Pjaxen',
    ],
    'should return expected array',
  );
});

test('buildArgs with option mavenAggregateProject', async (t) => {
  const mavenAggregateProject = true;
  const result = plugin.buildArgs(
    '.',
    '.',
    'pom.xml',
    ['-Paxis', '-Pjaxen'],
    mavenAggregateProject,
  );
  t.same(
    result,
    [
      'test-compile',
      'dependency:tree',
      '-DoutputType=dot',
      '--batch-mode',
      '-Paxis',
      '-Pjaxen',
    ],
    'should return expected array',
  );
});
