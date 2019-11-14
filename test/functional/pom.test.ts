import * as path from 'path';
import * as test from 'tap-only';
import * as fs from 'fs';
import { createPom } from '../../lib/pom';

test('calling createPom with groupId and artifactId', async (t) => {
  const fixturePath = path.join(__dirname, '../fixtures/my-app/pom.xml');
  const expected = fs.readFileSync(fixturePath, 'utf8');
  const result = createPom('com.mycompany.app', 'my-app');
  t.equal(result, expected, 'should return expected pom.xml');
});

test('calling createPom with groupId, artifactId and version', async (t) => {
  const fixturePath = path.join(__dirname, '../fixtures/snyk/pom.xml');
  const expected = fs.readFileSync(fixturePath, 'utf8');
  const result = createPom('com.snyk', 'cli', '1.2.3');
  t.equal(result, expected, 'should return expected pom.xml');
});
