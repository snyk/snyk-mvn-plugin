import * as subProcess from '../../../lib/sub-process';

// A Maven download failure against an authenticated private repo prints the
// full URL, credentials included. Reproduce that shape from a throwaway
// process so the assertions exercise the real spawn/collect/reject path.
const CREDENTIAL_URL = 'https://deploy-user:hunter2@nexus.invalid/releases';
const FAILING_SCRIPT = `console.error('[ERROR] Failed to transfer file ${CREDENTIAL_URL}/lib-1.0.jar'); process.exit(1);`;

describe('subProcess.execute credential redaction', () => {
  it('redacts credentials from the rejected error message', async () => {
    expect.assertions(3);

    try {
      await subProcess.execute(process.execPath, ['-e', FAILING_SCRIPT], {});
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain('hunter2');
      expect(message).not.toContain('deploy-user');
      expect(message).toContain(
        'https://***:***@nexus.invalid/releases/lib-1.0.jar',
      );
    }
  });

  it('leaves the resolved stdout verbatim — it is parse input, not log text', async () => {
    // dependency:list-repositories output feeds the distribution:url label,
    // whose own URL-aware sanitiser is the control for that data path. The
    // subprocess layer must not pre-mangle it.
    const repoLine = ` * internal (${CREDENTIAL_URL}, default, releases)`;
    const stdout = await subProcess.execute(
      process.execPath,
      ['-e', `console.log(${JSON.stringify(repoLine)})`],
      {},
    );

    expect(stdout.trim()).toBe(repoLine.trim());
  });
});

describe('debug() credential redaction', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('redacts credentials before they reach the logger', async () => {
    const log = jest.fn();
    jest.doMock('debug', () => {
      const factory = () => log;
      factory.enable = jest.fn();
      return factory;
    });

    const { debug } = await import('../../../lib/index');
    debug(`>>> Output from mvn: downloading from ${CREDENTIAL_URL}/a.jar`);

    expect(log).toHaveBeenCalledWith(
      '>>> Output from mvn: downloading from https://***:***@nexus.invalid/releases/a.jar',
    );
  });
});
