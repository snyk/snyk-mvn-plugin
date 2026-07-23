import * as childProcess from 'child_process';
import { debug } from './index';
import { escapeAll, quoteAll } from 'shescape/stateless';
import * as os from 'node:os';

/**
 * Redact credential-shaped spans from a subprocess's diagnostic output before it
 * is logged or folded into an error message. Maven itself holds the credentials
 * (settings.xml `<server>` blocks, inline repo/mirror URLs), so — unlike a
 * builder that is handed the secret — we can only scrub by *shape*, not by
 * masking a known literal. This matters most for aggregate (multi-module)
 * builds: Maven walks every module, so a later module failing can leave an
 * earlier module's repository URLs (userinfo and all) in the partial STDOUT/
 * STDERR we then surface.
 *
 * Only failure diagnostics are passed through here; the success output is
 * returned verbatim because it is the real data we parse (and the repo-URL
 * path already strips credentials at ingest).
 */
export function sanitiseSubprocessOutput(text: string): string {
  return (
    text
      // URL userinfo: `scheme://user:token@host/…` → `scheme://host/…`. Keep the
      // host (which repo failed is useful for debugging); drop only the
      // credential. `[^/\s]*@` consumes the whole authority-local userinfo up to
      // its last `@`, and cannot cross a `/`, so an `@` in a path is left alone.
      .replace(/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^/\s]*@/g, '$1')
      // Auth headers Maven's HTTP wagon can echo under verbose/transport logging.
      .replace(
        /(Authorization:\s*(?:Basic|Bearer|Digest)\s+)\S+/gi,
        '$1<redacted>',
      )
  );
}

export function execute(command, args, options): Promise<string> {
  const spawnOptions: {
    shell: boolean;
    cwd?: string;
    env: Record<string, string | undefined>;
  } = { shell: false, env: { ...process.env } };

  if (options && options.cwd) {
    spawnOptions.cwd = options.cwd;
  }

  if (args) {
    // Best practices, also security-wise, is to not invoke processes in a shell, but as a stand-alone command.
    // However, on Windows, we need to invoke the command in a shell, due to internal NodeJS problems with this approach
    // see: https://nodejs.org/docs/latest-v24.x/api/child_process.html#spawning-bat-and-cmd-files-on-windows
    const isWinLocal = /^win/.test(os.platform());
    if (isWinLocal) {
      spawnOptions.shell = true;
      // Further, we distinguish between quoting and escaping arguments since quoteAll does not support quoting without
      // supplying a shell, but escapeAll does.
      // See this (very long) discussion for more details: https://github.com/ericcornelissen/shescape/issues/2009
      args = quoteAll(args, { ...spawnOptions, flagProtection: false });
    } else {
      args = escapeAll(args, { ...spawnOptions, flagProtection: false });
    }
  }

  // Before spawning an external process, we look if we need to restore the system proxy configuration,
  // which overrides the cli internal proxy configuration.
  if (process.env.SNYK_SYSTEM_HTTP_PROXY !== undefined) {
    spawnOptions.env.HTTP_PROXY = process.env.SNYK_SYSTEM_HTTP_PROXY;
  }
  if (process.env.SNYK_SYSTEM_HTTPS_PROXY !== undefined) {
    spawnOptions.env.HTTPS_PROXY = process.env.SNYK_SYSTEM_HTTPS_PROXY;
  }
  if (process.env.SNYK_SYSTEM_NO_PROXY !== undefined) {
    spawnOptions.env.NO_PROXY = process.env.SNYK_SYSTEM_NO_PROXY;
  }

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const proc = childProcess.spawn(command, args, spawnOptions);
    proc.stdout.on('data', (data) => {
      stdout = stdout + data;
    });
    proc.stderr.on('data', (data) => {
      stderr = stderr + data;
    });

    proc.on('error', (err) => {
      debug(`Child process errored with: ${err.message}`);
    });

    proc.on('exit', (code) => {
      debug(`Child process exited with code: ${code}`);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        // Scrub credentials out of the diagnostic output before it reaches any
        // log sink or error message (see sanitiseSubprocessOutput).
        const safeStderr = sanitiseSubprocessOutput(stderr);
        const safeStdout = sanitiseSubprocessOutput(stdout);

        debug(
          `Child process failed with exit code: ${code}`,
          '----------------',
          'STDERR:',
          safeStderr,
          '----------------',
          'STDOUT:',
          safeStdout,
          '----------------',
        );

        const stdErrMessage = safeStderr ? `\nSTDERR:\n${safeStderr}` : '';
        const stdOutMessage = safeStdout ? `\nSTDOUT:\n${safeStdout}` : '';
        const debugSuggestion = process.env.DEBUG
          ? ''
          : `\nRun in debug mode (-d) to see STDERR and STDOUT.`;

        return reject(
          new Error(
            `Child process failed with exit code: ${code}.` +
              debugSuggestion +
              (stdErrMessage || stdOutMessage),
          ),
        );
      }
      resolve(stdout || stderr);
    });
  });
}
