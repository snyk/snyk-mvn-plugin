import * as os from 'os';
import * as path from 'path';
import * as subProcess from '../../../lib/sub-process';
import { getMavenRepositoryPath } from '../../../lib/fingerprint';
import type { MavenContext } from '../../../lib/maven/context';

jest.mock('../../../lib/sub-process');

const mockedExecute = subProcess.execute as jest.MockedFunction<
  typeof subProcess.execute
>;

const context: MavenContext = {
  command: './mvnw',
  workingDirectory: '/project/nested',
  root: '/project',
  targetFile: 'nested/pom.xml',
  targetPath: '/project/nested/pom.xml',
};

const defaultRepositoryPath = path.join(os.homedir(), '.m2', 'repository');

describe('getMavenRepositoryPath', () => {
  beforeEach(() => {
    mockedExecute.mockReset();
  });

  it('runs help:evaluate through the hardened sub-process wrapper', async () => {
    // The point of the assertion is the shape: a command plus a separate
    // argument vector (no shell string), and the project's working directory.
    mockedExecute.mockResolvedValue(os.tmpdir());

    await expect(getMavenRepositoryPath(context)).resolves.toBe(os.tmpdir());

    expect(mockedExecute).toHaveBeenCalledTimes(1);
    expect(mockedExecute).toHaveBeenCalledWith(
      './mvnw',
      [
        'help:evaluate',
        '-Dexpression=settings.localRepository',
        '-DforceStdout',
        '-q',
      ],
      { cwd: '/project/nested' },
    );
  });

  it('trims surrounding whitespace from the reported path', async () => {
    mockedExecute.mockResolvedValue(`\n${os.tmpdir()}\n`);

    await expect(getMavenRepositoryPath(context)).resolves.toBe(os.tmpdir());
  });

  it('short-circuits on a provided path without spawning Maven', async () => {
    await expect(getMavenRepositoryPath(context, '/custom/repo')).resolves.toBe(
      '/custom/repo',
    );

    expect(mockedExecute).not.toHaveBeenCalled();
  });

  it('falls back to the default location when Maven fails', async () => {
    mockedExecute.mockRejectedValue(new Error('Child process failed'));

    await expect(getMavenRepositoryPath(context)).resolves.toBe(
      defaultRepositoryPath,
    );
  });

  it('falls back to the default location when the reported path does not exist', async () => {
    mockedExecute.mockResolvedValue(
      path.join(os.tmpdir(), 'definitely-not-a-real-m2-repository'),
    );

    await expect(getMavenRepositoryPath(context)).resolves.toBe(
      defaultRepositoryPath,
    );
  });
});
