import { test } from 'tap';
import { parseDependency } from '../../lib/parse/dependency';

test('parseDependency returns expected object', async (t) => {
  t.same(
    parseDependency('com.example:my-app:jar:1.2.3'),
    {
      groupId: 'com.example',
      artifactId: 'my-app',
      type: 'jar',
      version: '1.2.3',
    },
    'when input has 4 parts',
  );
  t.same(
    parseDependency('com.example:my-app:jar:1.2.3:compile'),
    {
      groupId: 'com.example',
      artifactId: 'my-app',
      type: 'jar',
      version: '1.2.3',
      scope: 'compile',
    },
    'when input has 5 parts',
  );
  t.same(
    parseDependency('com.example:my-app:jar:jdk8:1.2.3:compile'),
    {
      groupId: 'com.example',
      artifactId: 'my-app',
      type: 'jar',
      version: '1.2.3',
      scope: 'compile',
      classifier: 'jdk8',
    },
    'when input has 6 parts',
  );
});

test('parseDependency returns unknown', async (t) => {
  t.same(
    parseDependency(''),
    {
      groupId: 'unknown',
      artifactId: 'unknown',
      type: 'unknown',
      version: 'unknown',
    },
    'when input is empty string',
  );
  t.same(
    parseDependency('foo:bar'),
    {
      groupId: 'unknown',
      artifactId: 'unknown',
      type: 'unknown',
      version: 'unknown',
    },
    'when input has less than 4 parts',
  );
  t.same(
    parseDependency(':::::'),
    {
      groupId: 'unknown',
      artifactId: 'unknown',
      type: 'unknown',
      version: 'unknown',
      scope: 'unknown',
      classifier: 'unknown',
    },
    'when input has empty parts',
  );
  t.same(
    parseDependency(':::1.2.3'),
    {
      groupId: 'unknown',
      artifactId: 'unknown',
      type: 'unknown',
      version: '1.2.3',
    },
    'when input has a mix of empty and valid parts',
  );
  t.same(
    parseDependency(1),
    {
      groupId: 'unknown',
      artifactId: 'unknown',
      type: 'unknown',
      version: 'unknown',
    },
    'when input is not a string',
  );
});
