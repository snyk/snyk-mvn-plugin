import * as test from 'tap-only';
import { readFixture } from '../file-helper';
import { getPomContents } from '../../lib/pom';

const dummyRoot = {
  groupId: 'dummy',
  artifactId: 'dummy',
  version: '1.0.0',
};

test('getPomContents with no dependencies and dummy root', async (t) => {
  const expected = await readFixture('dummy/pom-no-deps.xml');
  const result = getPomContents([], dummyRoot);
  t.equal(result, expected, 'should return expected pom.xml');
});

test('getPomContents with one dependency and dummy root', async (t) => {
  const expected = await readFixture('dummy/pom-one-dep.xml');
  const result = getPomContents(
    [
      {
        groupId: 'group',
        artifactId: 'artifact',
        version: '1.0.0',
      },
    ],
    dummyRoot,
  );
  t.equal(result, expected, 'should return expected pom.xml');
});

test('getPomContents with multiple dependencies', async (t) => {
  const expected = await readFixture('dummy/pom-multiple-deps.xml');
  const result = getPomContents(
    [
      {
        groupId: 'group1',
        artifactId: 'artifact1',
        version: '1.0.0',
      },
      {
        groupId: 'group2',
        artifactId: 'artifact2',
        version: '2.0.0',
      },
    ],
    dummyRoot,
  );
  t.equal(result, expected, 'should return expected pom.xml');
});
