import * as childProcess from 'child_process';
import * as path from 'path';
import { getMavenRepositoryPath } from '../../../lib/fingerprint';

// Wrap exec so the options handed to it are observable. Keep promisify's
// custom form (which resolves { stdout, stderr }) routed through the wrapper.
jest.mock('child_process', () => {
  const util = require('util');
  const actual = jest.requireActual('child_process');
  const execMock = jest.fn(actual.exec);
  execMock[util.promisify.custom] = (command: string, options?: object) =>
    new Promise((resolve, reject) => {
      execMock(
        command,
        options,
        (error: Error | null, stdout: string, stderr: string) =>
          error ? reject(error) : resolve({ stdout, stderr }),
      );
    });
  return { ...actual, exec: execMock };
});

const REPO_PROBE_FIXTURE = path.join(
  __dirname,
  '..',
  '..',
  'fixtures',
  'print-repo-path-if-no-snyk-env.js',
);

describe('fingerprint child process env', () => {
  beforeEach(() => {
    (childProcess.exec as unknown as jest.Mock).mockClear();
  });

  it('does not leak SNYK_* variables to the maven command', async () => {
    const saved = {
      SNYK_TOKEN: process.env.SNYK_TOKEN,
      SNYK_OAUTH_TOKEN: process.env.SNYK_OAUTH_TOKEN,
    };
    try {
      process.env.SNYK_TOKEN = 'secret-token';
      process.env.SNYK_OAUTH_TOKEN = 'secret-oauth-token';

      const probeCommand = `${JSON.stringify(
        process.execPath,
      )} ${JSON.stringify(REPO_PROBE_FIXTURE)}`;
      const repoPath = await getMavenRepositoryPath(probeCommand);

      // Deterministic: the env handed to exec must be explicit and sanitized.
      const execOptions = (childProcess.exec as unknown as jest.Mock).mock
        .calls[0][1] as { env?: Record<string, string | undefined> };
      expect(execOptions?.env).toBeDefined();
      expect(
        Object.keys(execOptions?.env ?? {}).filter((k) => /^snyk_/i.test(k)),
      ).toEqual([]);

      // Behavioral: the real maven command sees no SNYK_* variables.
      expect(repoPath).toBe(path.dirname(REPO_PROBE_FIXTURE));
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
