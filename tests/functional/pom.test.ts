import * as test from 'tap-only';
import * as path from 'path';
import { readFixture } from '../file-helper';
import { createPom } from '../../lib/pom';

test('createPom with dependency and root dependency', async (t) => {
  const expected = await readFixture('snyk/pom.xml');
  const result = createPom(
    {
      artifactId: 'artifact',
      groupId: 'group',
      version: '1.0.0',
    },
    {
      projectGroupId: path.join('com', 'snyk', 'cli'),
      projectArtifactId: 'a.jar',
    },
  );
  t.equal(result, expected, 'should return expected pom.xml');
});
