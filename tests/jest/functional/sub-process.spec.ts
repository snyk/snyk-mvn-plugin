import * as path from 'path';
import { execute } from '../../../lib/sub-process';

const PRINT_ENV_FIXTURE = path.join(
  __dirname,
  '..',
  '..',
  'fixtures',
  'print-env.js',
);

describe('sub-process', () => {
  it('does not leak SNYK_* variables to the child process', async () => {
    const parentEnv: Record<string, string> = {
      SNYK_TOKEN: 'secret-token',
      SNYK_OAUTH_TOKEN: 'secret-oauth-token',
      snyk_cfg_api: 'secret-cfg-api',
      HTTP_PROXY: 'http://internal:1',
      SNYK_SYSTEM_HTTP_PROXY: 'http://corp:3128',
      CLI_2071_CONTROL: 'keep',
    };
    const saved = new Map<string, string | undefined>();
    for (const key of Object.keys(parentEnv)) {
      saved.set(
        key,
        Object.prototype.hasOwnProperty.call(process.env, key)
          ? process.env[key]
          : undefined,
      );
    }

    try {
      Object.assign(process.env, parentEnv);

      const output = await execute('node', [PRINT_ENV_FIXTURE], {});
      const childEnv: Record<string, string> = JSON.parse(output);

      expect(Object.keys(childEnv).filter((k) => /^snyk_/i.test(k))).toEqual(
        [],
      );
      expect(childEnv.HTTP_PROXY).toBe('http://corp:3128');
      expect(childEnv.CLI_2071_CONTROL).toBe('keep');
      expect(
        Object.keys(childEnv).some((k) => k.toUpperCase() === 'PATH'),
      ).toBe(true);
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });
});
