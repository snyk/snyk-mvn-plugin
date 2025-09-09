import { readFixture } from '../../helpers/read';
import { parseVersions } from '../../../lib/parse-versions';

describe('parseVersions', () => {
  test('should parse versions from mvn --version', async () => {
    const mavenOutput = await readFixture('parse-mvn/maven-versions.txt');
    const result = parseVersions(mavenOutput);

    expect(result).toBeDefined();
    expect(result.javaVersion).toBe(
      'Java version: 12.0.1, vendor: Oracle Corporation, runtime: /Library/Java/JavaVirtualMachines/openjdk-12.0.1.jdk/Contents/Home',
    );
    expect(result.mavenVersion).toBe(
      'Apache Maven 3.6.2 (40f52333136460af0dc0d7232c0dc0bcf0d9e117; 2019-08-27T17:06:16+02:00)',
    );
  });
});
