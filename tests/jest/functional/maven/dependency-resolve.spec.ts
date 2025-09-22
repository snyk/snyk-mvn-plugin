import { buildArgs } from '../../../../lib/maven/dependency-resolve';
import { createMavenContext } from '../../../../lib/maven/context';

describe('buildArgs', () => {
  test('should work with array', async () => {
    const context = createMavenContext('.', undefined);
    const result = buildArgs(context, ['-Paxis', '-Pjaxen']);
    expect(result).toEqual([
      'org.apache.maven.plugins:maven-dependency-plugin:3.6.1:resolve',
      '--batch-mode',
      '--non-recursive',
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
      'org.apache.maven.plugins:maven-dependency-plugin:3.6.1:resolve',
      '--batch-mode',
      '-Paxis',
      '-Pjaxen',
    ]);
  });

  test('should work with targetFile when not mavenAggregateProject', async () => {
    const context = createMavenContext(
      './tests/fixtures/test-project',
      'pom.xml',
    );
    const result = buildArgs(context, ['-Paxis', '-Pjaxen']);
    expect(result).toEqual([
      'org.apache.maven.plugins:maven-dependency-plugin:3.6.1:resolve',
      '--batch-mode',
      '--non-recursive',
      '--file="pom.xml"',
      '-Paxis',
      '-Pjaxen',
    ]);
  });
});
