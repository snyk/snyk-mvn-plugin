import * as childProcess from 'child_process';
import { debug } from './index';
import { redactUrlCredentials } from './redact';
import { escapeAll, quoteAll } from 'shescape/stateless';
import * as os from 'node:os';

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
      // Redact once here, on the fully-accumulated buffers, so no credential
      // survives the subprocess boundary in either direction — resolved value
      // or rejected error. Doing it at the boundary rather than at each
      // consumer means a future sink (a new throw, a file write, a field on
      // the dep-graph) is covered without anyone having to remember.
      //
      // Accumulated, not per-chunk, on purpose: a credential split across two
      // stream writes would evade a per-write scrubber.
      //
      // Safe for the one consumer that re-parses a URL out of this output:
      // `dependency:list-repositories` feeds `stripUrlCredentials` in
      // parse/m2-remote-repositories.ts, which clears whatever userinfo it
      // finds — the placeholder included — and yields the same credential-free
      // URL either way. See the `new URL()` test pinning that.
      const safeStdout = redactUrlCredentials(stdout);
      const safeStderr = redactUrlCredentials(stderr);

      if (code !== 0) {
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
      resolve(safeStdout || safeStderr);
    });
  });
}
