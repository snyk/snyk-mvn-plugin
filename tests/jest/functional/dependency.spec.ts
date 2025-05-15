import {
  buildDependencyString,
  parseDependency,
} from '../../../lib/parse/dependency';
import { MavenDependency } from '../../../lib/parse/types';

test('parseDependency returns expected object when input has 4 parts', async () => {
  expect(parseDependency('com.example:my-app:jar:1.2.3')).toEqual({
    groupId: 'com.example',
    artifactId: 'my-app',
    type: 'jar',
    version: '1.2.3',
  });
});
test('parseDependency returns expected object when input has 5 parts', async () => {
  expect(parseDependency('com.example:my-app:jar:1.2.3:compile')).toEqual({
    groupId: 'com.example',
    artifactId: 'my-app',
    type: 'jar',
    version: '1.2.3',
    scope: 'compile',
  });
});
test('parseDependency returns expected object when input has 6 parts', async () => {
  expect(parseDependency('com.example:my-app:jar:jdk8:1.2.3:compile')).toEqual({
    groupId: 'com.example',
    classifier: 'jdk8',
    artifactId: 'my-app',
    type: 'jar',
    version: '1.2.3',
    scope: 'compile',
  });
});

test('parseDependency returns unknown when input is empty string', async () => {
  expect(parseDependency('')).toEqual({
    groupId: 'unknown',
    artifactId: 'unknown',
    type: 'unknown',
    version: 'unknown',
  });
});
test('parseDependency returns unknown when input has less than 4 parts', async () => {
  expect(parseDependency('foo:bar')).toEqual({
    groupId: 'unknown',
    artifactId: 'unknown',
    type: 'unknown',
    version: 'unknown',
  });
});
test('parseDependency returns unknown when input has empty parts', async () => {
  expect(parseDependency(':::::')).toEqual({
    groupId: 'unknown',
    artifactId: 'unknown',
    type: 'unknown',
    version: 'unknown',
    scope: 'unknown',
    classifier: 'unknown',
  });
});
test('parseDependency returns unknown when input has a mix of empty and valid parts', async () => {
  expect(parseDependency(':::1.2.3')).toEqual({
    groupId: 'unknown',
    artifactId: 'unknown',
    type: 'unknown',
    version: '1.2.3',
  });
});
test('parseDependency returns unknown when input is not a string', async () => {
  expect(parseDependency('1')).toEqual({
    groupId: 'unknown',
    artifactId: 'unknown',
    type: 'unknown',
    version: 'unknown',
  });
});

describe('buildDependencyString', () => {
  it('should build a string with groupId, artifactId, type, and version', () => {
    const dependency: MavenDependency = {
      groupId: 'com.example',
      artifactId: 'my-app',
      type: 'jar',
      version: '1.2.3',
    };
    const result = buildDependencyString(dependency);
    expect(result).toEqual('com.example:my-app:jar:1.2.3');
  });

  it('should include scope if provided', () => {
    const dependency: MavenDependency = {
      groupId: 'com.example',
      artifactId: 'my-app',
      type: 'jar',
      version: '1.2.3',
      scope: 'compile',
    };
    const result = buildDependencyString(dependency);
    expect(result).toEqual('com.example:my-app:jar:1.2.3:compile');
  });

  it('should include classifier before version if provided', () => {
    const dependency: MavenDependency = {
      groupId: 'com.example',
      artifactId: 'my-app',
      type: 'jar',
      version: '1.2.3',
      classifier: 'jdk8',
    };
    const result = buildDependencyString(dependency);
    expect(result).toEqual('com.example:my-app:jar:jdk8:1.2.3');
  });

  it('should include both classifier and scope if provided', () => {
    const dependency: MavenDependency = {
      groupId: 'com.example',
      artifactId: 'my-app',
      type: 'jar',
      version: '1.2.3',
      classifier: 'jdk8',
      scope: 'compile',
    };
    const result = buildDependencyString(dependency);
    expect(result).toEqual('com.example:my-app:jar:jdk8:1.2.3:compile');
  });

  it('should handle unknown fields and only valid vaersion', () => {
    const dependency: MavenDependency = {
      groupId: 'unknown',
      artifactId: 'unknown',
      type: 'unknown',
      version: '1.2.3',
    };
    const result = buildDependencyString(dependency);
    expect(result).toEqual(':::1.2.3');
  });
});
