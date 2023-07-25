import * as test from 'tap-only';
import { readFixture } from '../helpers/read';
import { parseVersions } from '../../lib/parse-versions';

test('parseVersions from mvn --version', async (t) => {
  const mavenOutput = await readFixture('parse-mvn/maven-versions.txt');
  const result = parseVersions(mavenOutput);
  if (result) {
    t.equals(
      result.javaVersion,
      'Java version: 12.0.1, vendor: Oracle Corporation, runtime: /Library/Java/JavaVirtualMachines/openjdk-12.0.1.jdk/Contents/Home',
    );
    t.equals(
      result.mavenVersion,
      'Apache Maven 3.6.2 (40f52333136460af0dc0d7232c0dc0bcf0d9e117; 2019-08-27T17:06:16+02:00)',
    );
  } else {
    t.fail('result.data.dependencies was empty');
  }
});
