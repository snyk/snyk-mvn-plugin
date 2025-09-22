import * as path from 'path';
import { getCommand } from '../../../../lib/maven/context';
import * as os from 'os';

describe('getCommand', () => {
  it("should return 'mvn' when no mvnw present in path", async () => {
    const cmd = getCommand(
      '.',
      path.join(__dirname, '../../..', 'fixtures/path with spaces', 'pom.xml'),
    );

    expect(cmd).toBe('mvn');
  });

  it("should return 'mvnw' when 'mvnw' present in path", async () => {
    const cmd = getCommand(
      '.',
      path.join(__dirname, '../../..', 'fixtures/maven-with-mvnw', 'pom.xml'),
    );

    const isWinLocal = /^win/.test(os.platform());

    if (isWinLocal) {
      expect(cmd).toBe('mvnw.cmd');
    } else {
      expect(cmd).toBe('./mvnw');
    }
  });
});
