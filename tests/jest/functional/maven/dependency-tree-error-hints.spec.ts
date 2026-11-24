import { OpenSourceEcosystems } from '@snyk/error-catalog-nodejs-public';
import * as subProcess from '../../../../lib/sub-process';
import { executeMavenDependencyTree } from '../../../../lib/maven/dependency-tree';
import {
  appendMavenErrorHints,
  getMavenErrorHints,
} from '../../../../lib/maven/error-hints';
import { createMavenContext } from '../../../../lib/maven/context';

jest.mock('../../../../lib/sub-process');

const mockedExecute = subProcess.execute as jest.MockedFunction<
  typeof subProcess.execute
>;

const BASE_MESSAGE = 'Cannot build Maven dependency tree';

// Mirrors how lib/sub-process.ts formats a failing Maven run.
function mavenFailure(output: string): Error {
  return new Error(
    `Child process failed with exit code: 1.\nSTDERR:\n${output}`,
  );
}

// The catalog error keeps a fixed `message` (title); the text shown to the user
// is `detail`, which is where the hint is appended.
function detailOf(err: Error): string {
  return (err as any).detail;
}

async function runAndCatch(error: Error): Promise<Error> {
  mockedExecute.mockRejectedValueOnce(error);
  const context = createMavenContext('.', undefined);
  try {
    await executeMavenDependencyTree(context, false, false, []);
  } catch (err) {
    return err as Error;
  }
  throw new Error('Expected executeMavenDependencyTree to throw');
}

describe('Maven certificate / authentication hints', () => {
  beforeEach(() => {
    mockedExecute.mockReset();
  });

  const certOutputs = [
    [
      'PKIX path building failed',
      '[ERROR] Failed to execute goal ...: Could not transfer artifact a:b:pom:1.0 from/to private (https://repo.example.com/maven): PKIX path building failed: sun.security.provider.certpath.SunCertPathBuilderException',
    ],
    [
      'unable to find valid certification path',
      'sun.security.provider.certpath.SunCertPathBuilderException: unable to find valid certification path to requested target',
    ],
    [
      'SSLHandshakeException',
      'Caused by: javax.net.ssl.SSLHandshakeException: Remote host terminated the handshake',
    ],
  ];

  test.each(certOutputs)('adds truststore hint for %s', async (_n, output) => {
    const err = await runAndCatch(mavenFailure(output));

    expect(err).toBeInstanceOf(
      OpenSourceEcosystems.FailedToBuildMavenProjectError,
    );
    expect(detailOf(err).startsWith(BASE_MESSAGE)).toBe(true);
    expect(err.message).toBe(BASE_MESSAGE);
    expect(detailOf(err)).toContain('does not trust');
    expect(detailOf(err)).toContain('-Djavax.net.ssl.trustStore=<path>');
    expect(detailOf(err)).toContain('-Djavax.net.ssl.trustStorePassword=<pw>');
    expect(detailOf(err)).toContain('MAVEN_OPTS');
    expect(detailOf(err)).not.toContain('settings.xml');
    expect((err as any).metadata.errorCode).toBe('SNYK-OS-MAVEN-0018');
  });

  const authOutputs = [
    [
      '401 Unauthorized',
      'Server returned HTTP response code: 401 Unauthorized',
    ],
    ['403 Forbidden', 'Server returned HTTP response code: 403 Forbidden'],
    ['Return code is: 401', 'Return code is: 401, ReasonPhrase: Unauthorized.'],
    [
      'status code: 401',
      'Could not transfer artifact a:b:jar:1.0 from/to central (https://r.example.com): status code: 401, reason phrase: Unauthorized (401)',
    ],
    [
      'Return code is: 403',
      'Could not transfer artifact a:b:jar:1.0 from/to private (https://r.example.com): Return code is: 403, ReasonPhrase: Forbidden.',
    ],
    [
      'status code: 403',
      'Could not transfer artifact a:b:jar:1.0 from/to private (https://r.example.com): status code: 403, reason phrase: Forbidden (403)',
    ],
  ];

  test.each(authOutputs)(
    'adds settings.xml hint for %s',
    async (_n, output) => {
      const err = await runAndCatch(mavenFailure(output));

      expect(err).toBeInstanceOf(
        OpenSourceEcosystems.FailedToBuildMavenProjectError,
      );
      expect(detailOf(err).startsWith(BASE_MESSAGE)).toBe(true);
      expect(detailOf(err)).toContain('settings.xml');
      expect(detailOf(err)).toContain('<server>');
      expect(detailOf(err)).toContain('<id>');
      expect(detailOf(err)).not.toContain('trustStore');
    },
  );

  test('adds both hints when both patterns appear', async () => {
    const err = await runAndCatch(
      mavenFailure('PKIX path building failed\nstatus code: 401'),
    );
    expect(detailOf(err)).toContain('trustStore');
    expect(detailOf(err)).toContain('settings.xml');
  });

  test.each([
    [
      'version number containing 401',
      'Could not find artifact g:a:jar:1.0.401 in central',
    ],
    ['port / line number 403', 'Error at pom.xml:[403,12] unexpected token'],
    ['unrelated failure', 'Compilation failure: cannot find symbol'],
    ['bare 401 word', 'Downloaded 401 KB in 3s'],
  ])('does not add a hint for %s', async (_n, output) => {
    const err = await runAndCatch(mavenFailure(output));

    expect(err).toBeInstanceOf(
      OpenSourceEcosystems.FailedToBuildMavenProjectError,
    );
    expect(detailOf(err)).toBe(BASE_MESSAGE);
    expect(err.message).toBe(BASE_MESSAGE);
  });

  test('keeps the existing message for non-Error rejections', async () => {
    mockedExecute.mockRejectedValueOnce('PKIX path building failed' as any);
    const context = createMavenContext('.', undefined);
    await expect(
      executeMavenDependencyTree(context, false, false, []),
    ).rejects.toMatchObject({ detail: BASE_MESSAGE });
  });

  test('Non-parseable POM handling is unchanged', async () => {
    const err = await runAndCatch(
      mavenFailure('Non-parseable POM /x/pom.xml PKIX path building failed'),
    );
    expect(err).toBeInstanceOf(OpenSourceEcosystems.UnableToParseXMLError);
    expect(detailOf(err)).toBe('Error parsing the XML file');
  });

  describe('helpers', () => {
    test('getMavenErrorHints returns nothing for empty input', () => {
      expect(getMavenErrorHints('')).toEqual([]);
    });

    test('appendMavenErrorHints is idempotent', () => {
      const output = 'PKIX path building failed status code: 403';
      const once = appendMavenErrorHints(BASE_MESSAGE, output);
      const twice = appendMavenErrorHints(once, output);
      expect(once).not.toBe(BASE_MESSAGE);
      expect(twice).toBe(once);
    });

    test('appendMavenErrorHints returns the message untouched without a match', () => {
      expect(appendMavenErrorHints(BASE_MESSAGE, 'boom')).toBe(BASE_MESSAGE);
    });
  });
});
