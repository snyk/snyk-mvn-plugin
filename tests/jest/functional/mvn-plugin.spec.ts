import * as plugin from '../../../lib';

describe('buildArgs', () => {
  test('should work with array', async () => {
    const result = plugin.buildArgs('.', '.', undefined, ['-Paxis', '-Pjaxen']);
    expect(result).toEqual([
      'dependency:tree',
      '-DoutputType=dot',
      '--batch-mode',
      '--non-recursive',
      '-Paxis',
      '-Pjaxen',
    ]);
  });

  test('should work with option mavenAggregateProject', async () => {
    const mavenAggregateProject = true;
    const result = plugin.buildArgs(
      '.',
      '.',
      'pom.xml',
      ['-Paxis', '-Pjaxen'],
      mavenAggregateProject,
    );
    expect(result).toEqual([
      'test-compile',
      'dependency:tree',
      '-DoutputType=dot',
      '--batch-mode',
      '-Paxis',
      '-Pjaxen',
    ]);
  });
});
