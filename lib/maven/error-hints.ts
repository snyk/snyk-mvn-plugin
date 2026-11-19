// Actionable hints for Maven failures that are common with private
// repositories. Maven's own output is only visible in debug mode, so these
// hints are appended to the error message the user sees by default.

const CERT_PATTERNS: RegExp[] = [
  /PKIX path building failed/i,
  /unable to find valid certification path to requested target/i,
  /SSLHandshakeException/,
];

// Deliberately anchored on Maven's status-code phrasing, so that a bare
// "401"/"403" (e.g. inside a version number or a line number) never matches.
const AUTH_PATTERNS: RegExp[] = [
  /\b401 Unauthorized\b/i,
  /\b403 Forbidden\b/i,
  /Return code is:\s*40[13]\b/i,
  /status code:\s*40[13]\b/i,
];

// Note on syntax: this plugin appends the user supplied `args` to the Maven
// command line unchanged (see buildArgs in dependency-tree.ts), which the
// Snyk CLI fills from the arguments after `--` (`snyk test -- -Dfoo=bar`).
// The child process also inherits the parent environment (lib/sub-process.ts),
// so MAVEN_OPTS set by the user reaches Maven. We could not verify the `--`
// pass-through from within this repository, as it is implemented by the CLI.
export const CERT_HINT =
  'Hint: the JVM running Maven does not trust the certificate presented by ' +
  'the repository (for example a self-signed or private CA certificate). ' +
  'Import the certificate into a Java truststore and pass it to Maven, e.g. ' +
  '`snyk test -- -Djavax.net.ssl.trustStore=<path> ' +
  '-Djavax.net.ssl.trustStorePassword=<pw>`, or set it via the MAVEN_OPTS ' +
  'environment variable.';

export const AUTH_HINT =
  'Hint: the repository rejected the request as unauthorized (HTTP 401/403). ' +
  'Make sure credentials for the repository are configured in your Maven ' +
  'settings.xml, in a <server> entry whose <id> matches the id of the ' +
  'repository in your pom.xml or settings.xml.';

export function getMavenErrorHints(output: string): string[] {
  if (!output) {
    return [];
  }
  const hints: string[] = [];
  if (CERT_PATTERNS.some((p) => p.test(output))) {
    hints.push(CERT_HINT);
  }
  if (AUTH_PATTERNS.some((p) => p.test(output))) {
    hints.push(AUTH_HINT);
  }
  return hints;
}

/**
 * Appends any matching hints to the message. Purely additive and idempotent:
 * the original message is always kept as the prefix, and a hint that is
 * already present is not added again.
 */
export function appendMavenErrorHints(
  message: string,
  mavenOutput: string,
): string {
  const missing = getMavenErrorHints(mavenOutput).filter(
    (hint) => !message.includes(hint),
  );
  return missing.length ? `${message}\n\n${missing.join('\n')}` : message;
}
