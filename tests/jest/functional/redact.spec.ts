import { redactUrlCredentials } from '../../../lib/redact';

describe('redactUrlCredentials', () => {
  it('redacts basic-auth userinfo from a repository URL', () => {
    expect(
      redactUrlCredentials('https://alice:s3cr3t@nexus.example.com/maven2'),
    ).toBe('https://***:***@nexus.example.com/maven2');
  });

  it('redacts credentials in a realistic Maven download failure line', () => {
    const stderr = [
      '[ERROR] Failed to execute goal on project app: Could not resolve dependencies',
      '[ERROR] Failed to transfer file https://deploy-user:hunter2@nexus.example.com/repository/releases/com/acme/lib/1.0/lib-1.0.jar',
      '[ERROR] Return code is: 401, ReasonPhrase: Unauthorized.',
    ].join('\n');

    const redacted = redactUrlCredentials(stderr);

    expect(redacted).not.toContain('hunter2');
    expect(redacted).not.toContain('deploy-user');
    expect(redacted).toContain(
      'https://***:***@nexus.example.com/repository/releases/com/acme/lib/1.0/lib-1.0.jar',
    );
  });

  it('redacts every occurrence on a line', () => {
    expect(
      redactUrlCredentials(
        'mirror https://a:1@one.invalid/m2 shadows https://b:2@two.invalid/m2',
      ),
    ).toBe(
      'mirror https://***:***@one.invalid/m2 shadows https://***:***@two.invalid/m2',
    );
  });

  it('redacts non-http schemes carrying userinfo', () => {
    expect(redactUrlCredentials('dav+https://u:p@host.invalid/repo')).toBe(
      'dav+https://***:***@host.invalid/repo',
    );
  });

  it('handles an empty password', () => {
    expect(redactUrlCredentials('https://token:@host.invalid/m2')).toBe(
      'https://***:***@host.invalid/m2',
    );
  });

  it('leaves credential-free URLs untouched', () => {
    const line =
      '[INFO] Downloading from central: https://repo.maven.apache.org/maven2/com/acme/lib/1.0/lib-1.0.jar';
    expect(redactUrlCredentials(line)).toBe(line);
  });

  it('leaves a URL with a port but no userinfo untouched', () => {
    const line = ' * internal (https://nexus.example.com:8443/m2, default)';
    expect(redactUrlCredentials(line)).toBe(line);
  });

  it('leaves userinfo without a password untouched', () => {
    // No secret present, and rewriting these would only add noise — see the
    // comment on URL_USERINFO in lib/redact.ts.
    expect(redactUrlCredentials('scm:git:ssh://git@github.com/acme/app')).toBe(
      'scm:git:ssh://git@github.com/acme/app',
    );
  });

  it('does not match an @ that appears later in the line', () => {
    const line = 'https://repo.example.com/maven2 contact ops@example.com';
    expect(redactUrlCredentials(line)).toBe(line);
  });

  it('does not reach across whitespace into a following URL', () => {
    expect(redactUrlCredentials('user:pw https://host.invalid/a@b/c.jar')).toBe(
      'user:pw https://host.invalid/a@b/c.jar',
    );
  });

  it('returns empty string unchanged', () => {
    expect(redactUrlCredentials('')).toBe('');
  });

  it('is idempotent', () => {
    // Redaction is applied at both the subprocess boundary and the log sink;
    // text crossing both must not be mangled by the second pass.
    const once = redactUrlCredentials('https://u:p@host.invalid/m2');
    expect(redactUrlCredentials(once)).toBe(once);
  });

  // Because redaction now runs on subProcess.execute's resolved value, a
  // redacted repository URL reaches stripUrlCredentials in
  // parse/m2-remote-repositories.ts, which re-parses it with new URL() to
  // build the distribution:url label. If the placeholder ever became
  // unparseable, new URL() would throw, the repo would be dropped, and the
  // label would silently disappear with no error anywhere. Pin it here so
  // changing the placeholder for readability trips a test instead.
  describe('placeholder stays safe for distribution:url handling', () => {
    const redacted = redactUrlCredentials(
      'https://alice:s3cr3t@nexus.example.com/maven2',
    );

    it('survives new URL() the way stripUrlCredentials parses it', () => {
      expect(() => new URL(redacted)).not.toThrow();
    });

    it('yields the same label as sanitising the raw URL would', () => {
      const fromRedacted = new URL(redacted);
      fromRedacted.username = '';
      fromRedacted.password = '';

      const fromRaw = new URL('https://alice:s3cr3t@nexus.example.com/maven2');
      fromRaw.username = '';
      fromRaw.password = '';

      expect(fromRedacted.toString()).toBe(fromRaw.toString());
      expect(fromRedacted.toString()).toBe('https://nexus.example.com/maven2');
    });
  });
});
