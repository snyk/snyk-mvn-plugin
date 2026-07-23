import { execute } from '../../../lib/sub-process';
import { sanitiseCredentials } from '../../../lib/sanitise-output';

describe('sanitiseCredentials', () => {
  it('strips userinfo from a repo URL but keeps the host and path', () => {
    expect(
      sanitiseCredentials(
        'Could not transfer artifact from https://user:s3cr3t@repo.internal/maven2/x.jar',
      ),
    ).toBe(
      'Could not transfer artifact from https://repo.internal/maven2/x.jar',
    );
  });

  it('strips user-only userinfo (no password)', () => {
    expect(sanitiseCredentials('see https://deploy-token@host/p')).toBe(
      'see https://host/p',
    );
  });

  it('leaves a credential-free URL untouched', () => {
    const line = 'downloading from https://repo.maven.apache.org/maven2/';
    expect(sanitiseCredentials(line)).toBe(line);
  });

  it('does not treat an @ in a URL path as userinfo', () => {
    const line = 'https://repo.internal/maven2/group/a@b/1.0/a@b-1.0.jar';
    expect(sanitiseCredentials(line)).toBe(line);
  });

  it('redacts HTTP Authorization headers', () => {
    expect(
      sanitiseCredentials('Authorization: Basic dXNlcjpwYXNzd29yZA=='),
    ).toBe('Authorization: Basic <redacted>');
    expect(
      sanitiseCredentials('authorization:  Bearer eyJhbGciOi.J9.sig'),
    ).toBe('authorization:  Bearer <redacted>');
  });

  it('scrubs an earlier module’s creds from partial aggregate-build output', () => {
    // moduleA's repo (with inline creds) is printed before moduleB fails: the
    // whole captured blob must be scrubbed, not just the failing line.
    const partial = [
      '[INFO] Building moduleA',
      ' * internal (https://ci:glpat-abcdef123456@nexus.corp/repo, default, releases)',
      '[INFO] Building moduleB',
      '[ERROR] Failed to read parent POM for moduleB',
    ].join('\n');
    const out = sanitiseCredentials(partial);
    expect(out).not.toContain('glpat-abcdef123456');
    expect(out).not.toContain('ci:');
    expect(out).toContain('https://nexus.corp/repo');
  });

  it('is a no-op for output with nothing to redact', () => {
    expect(sanitiseCredentials('BUILD FAILURE\n')).toBe(
      'BUILD FAILURE\n',
    );
  });
});

describe('execute() failure diagnostics', () => {
  it('rejects with a message that carries the host but not the credentials', async () => {
    // Spawn a real process that prints a credential-bearing URL and exits non-zero.
    await expect(
      execute(
        process.execPath,
        [
          '-e',
          'process.stderr.write("boom https://user:topsecret@repo.internal/x"); process.exit(3);',
        ],
        {},
      ),
    ).rejects.toThrow(/https:\/\/repo\.internal\/x/);

    await expect(
      execute(
        process.execPath,
        [
          '-e',
          'process.stderr.write("boom https://user:topsecret@repo.internal/x"); process.exit(3);',
        ],
        {},
      ),
    ).rejects.toThrow(
      expect.objectContaining({
        message: expect.not.stringContaining('topsecret'),
      }),
    );
  });
});
