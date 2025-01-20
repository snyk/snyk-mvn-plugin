import { parseDependency } from '../../../lib/parse/dependency';

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
