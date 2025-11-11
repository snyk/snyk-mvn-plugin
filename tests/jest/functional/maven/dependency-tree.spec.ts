import { buildArgs } from '../../../../lib/maven/dependency-tree';
import { createMavenContext } from '../../../../lib/maven/context';

describe('buildArgs', () => {
  test('should work with array', async () => {
    const context = createMavenContext('.', undefined);
    const result = buildArgs(context, ['-Paxis', '-Pjaxen']);
    expect(result).toEqual([
      'dependency:tree',
      '-DoutputType=dot',
      '--batch-mode',
      '--non-recursive',
      '-Paxis',
      '-Pjaxen',
    ]);
  });

  test('should work with targetFile', async () => {
    const context = createMavenContext(
      './tests/fixtures/test-project',
      'pom.xml',
    );
    const result = buildArgs(context, ['-Paxis', '-Pjaxen']);
    expect(result).toEqual([
      'dependency:tree',
      '-DoutputType=dot',
      '--batch-mode',
      '--non-recursive',
      '--file',
      'pom.xml',
      '-Paxis',
      '-Pjaxen',
    ]);
  });

  test('should work with option mavenAggregateProject', async () => {
    const mavenAggregateProject = true;
    const context = createMavenContext(
      './tests/fixtures/test-project',
      'pom.xml',
    );
    const result = buildArgs(
      context,
      ['-Paxis', '-Pjaxen'],
      mavenAggregateProject,
    );
    expect(result).toEqual([
      'test-compile',
      'dependency:tree',
      '-DoutputType=dot',
      '--batch-mode',
      '-Dmaven.test.skip=true',
      '-Dmaven.main.skip=true',
      '-Paxis',
      '-Pjaxen',
    ]);
  });

  test('should work with mavenAggregateProject option and verboseEnabled', async () => {
    const context = createMavenContext(
      './tests/fixtures/test-project',
      'pom.xml',
    );
    const mavenAggregateProject = true;
    const result = buildArgs(
      context,
      ['-Paxis', '-Pjaxen'],
      mavenAggregateProject,
      true,
    );
    expect(result).toEqual([
      'org.apache.maven.plugins:maven-dependency-plugin:3.6.1:tree',
      '-DoutputType=dot',
      '--batch-mode',
      '-Dverbose',
      '-Paxis',
      '-Pjaxen',
    ]);
  });
});
