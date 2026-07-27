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
 * Crucially, this is NOT applied to `subProcess.execute`'s return value.
 * That return value is parse input — `dependency:tree` dot output, `mvn
 * --version`, and `dependency:list-repositories`, whose repo URLs are exactly
 * what feeds `distribution:url`. Rewriting credentials there would put a
 * placeholder inside a string that a downstream parser then has to re-parse as
 * a URL, silently coupling label emission to the placeholder happening to be
 * URL-legal. Redacting at the sink instead keeps the data path exact and the
 * existing, stronger data-level control the only thing deciding what a label
 * may contain.
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
