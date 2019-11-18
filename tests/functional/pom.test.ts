import * as path from 'path';
import * as test from 'tap-only';
import * as fs from 'fs';
import { createPom } from '../../lib/pom';

test('calling createPom with groupId and artifactId', async (t) => {
  const fixturePath = path.join(__dirname, '../fixtures/my-app/pom.xml');
  const expected = fs.readFileSync(fixturePath, 'utf8');
  const result = createPom({
    artifactId: 'artifact',
    groupId: 'group',
    version: '1.0.0',
  });
  t.equal(result, expected, 'should return expected pom.xml');
});

test('calling createPom with groupId, artifactId and version', async (t) => {
  const fixturePath = path.join(__dirname, '../fixtures/snyk/pom.xml');
  const expected = fs.readFileSync(fixturePath, 'utf8');
  const result = createPom(
    {
      artifactId: 'artifact',
      groupId: 'group',
      version: '1.0.0',
    },
    'com.snyk.cli',
  );
  t.equal(result, expected, 'should return expected pom.xml');
});
