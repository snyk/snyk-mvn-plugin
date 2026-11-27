import * as path from 'path';
import { execute } from '../../../lib/sub-process';

const PRINT_ENV = path.join(__dirname, '..', '..', 'fixtures', 'print-env.js');

describe('child process environment', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it("the child gets no SNYK_* variables and the user's HTTP_PROXY", async () => {
    process.env = {
      ...originalEnv,
      SNYK_TOKEN: 'test-token',
      snyk_token: 'test-token-lowercase',
      HTTP_PROXY: 'http://internal:1',
      SNYK_SYSTEM_HTTP_PROXY: 'http://corp:3128',
    };

    const child = JSON.parse(await execute('node', [PRINT_ENV]));

    expect(child.snykKeys).toEqual([]);
    expect(child.HTTP_PROXY).toBe('http://corp:3128');
  });
});
