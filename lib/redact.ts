/**
 * Best-effort redaction of secrets in free-text destined for a log line or an
 * error message — i.e. text we only ever *display*, never parse.
 *
 * This is deliberately separate from the URL-aware `stripUrlCredentials` used
 * on `distribution:url` in `parse/m2-remote-repositories.ts`. The two solve
 * different problems and must not be merged:
 *
 *   - `stripUrlCredentials` sanitises *data*. It runs at the one trust boundary
 *     where a repo URL enters the plugin's own state, parses with `new URL()`,
 *     and rejects (drops the repo) when it cannot guarantee the result is
 *     clean. Correctness matters more than preserving the string.
 *   - `redactUrlCredentials` sanitises *presentation*. It runs over arbitrary
 *     Maven stdout/stderr, must never throw, and must never reject its input:
 *     the whole point is that a log line still gets emitted.
 *
 * Applied in two layers, deliberately overlapping:
 *
 *   1. At the subprocess boundary (`sub-process.ts`), to both the resolved
 *      value and the rejected error, so no credential survives into a string
 *      the plugin holds. This is what makes future sinks safe by default.
 *   2. At the log sink (`debug()` in `index.ts`), which catches what layer 1
 *      cannot: spawn-level failures and any `${err}` interpolation that never
 *      passed through the resolved value.
 *
 * The function is idempotent, so text crossing both layers is unaffected by
 * the second pass.
 *
 * Layer 1 is safe for the one consumer that re-parses a URL out of subprocess
 * output — `dependency:list-repositories` → `stripUrlCredentials` → the
 * `distribution:url` label. That parser clears whatever userinfo it finds
 * rather than pattern-matching a specific value, so a redacted URL and a raw
 * one both end up as the same credential-free label. `redact.spec.ts` pins
 * that with a `new URL()` assertion, so a future change to the placeholder
 * cannot quietly break label emission.
 */

/**
 * Basic-auth userinfo in a URL: `scheme://user:pass@host`.
 *
 * The password segment is required, matching the CLI's own log scrubber
 * (go-application-framework). Userinfo without a colon is left alone on
 * purpose: `ssh://git@github.com/...` and similar carry no secret, and
 * rewriting them would only add noise to the debug output this exists to keep
 * readable. Character classes stop at whitespace and at `/?#` — none of which
 * can appear in userinfo — so a match can never run past the authority
 * component and swallow an unrelated `@` further along the line.
 */
const URL_USERINFO = /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^\s/?#@:]+:[^\s/?#@]*@/g;

const REDACTED = '***:***';

/**
 * Replace embedded basic-auth credentials in any URLs found in `text`.
 *
 * Maven prints the full repository URL — credentials included — when a
 * download from an authenticated private repo fails, so its stdout/stderr can
 * carry `https://<user>:<secret>@nexus…`. Anything we surface verbatim (debug
 * logs, subprocess-failure error messages) goes through here first, so the
 * plugin does not rely solely on the CLI's log scrubber to catch it.
 */
export function redactUrlCredentials(text: string): string {
  return text.replace(URL_USERINFO, `$1${REDACTED}@`);
}
