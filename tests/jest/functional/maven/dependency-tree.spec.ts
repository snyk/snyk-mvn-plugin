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
      'org.apache.maven.plugins:maven-dependency-plugin:3.9.0:tree',
      '-DoutputType=dot',
      '--batch-mode',
      '-Dverbose',
      '-Paxis',
      '-Pjaxen',
    ]);
  });

  describe('pinNonVerbose', () => {
    const PINNED =
      'org.apache.maven.plugins:maven-dependency-plugin:3.9.0:tree';

    test('keeps the bare dependency:tree goal by default (non-verbose)', () => {
      const context = createMavenContext('.', undefined);
      expect(buildArgs(context, [])[0]).toBe('dependency:tree');
    });

    test('pins the supplied plugin version when pinNonVerbose is set', () => {
      const context = createMavenContext('.', undefined);
      expect(buildArgs(context, [], false, false, '3.6.1', true)[0]).toBe(
        'org.apache.maven.plugins:maven-dependency-plugin:3.6.1:tree',
      );
    });

    test('pins the default plugin version when pinNonVerbose is set', () => {
      const context = createMavenContext('.', undefined);
      expect(buildArgs(context, [], false, false, undefined, true)[0]).toBe(
        PINNED,
      );
    });

    test('verbose always pins regardless of pinNonVerbose', () => {
      const context = createMavenContext('.', undefined);
      expect(buildArgs(context, [], false, true, '3.9.0', false)[0]).toBe(
        PINNED,
      );
    });
  });
});
