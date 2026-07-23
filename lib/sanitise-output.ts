/**
 * Redact credential-shaped spans from Maven diagnostic output before it is
 * logged or folded into an error message. Maven itself holds the credentials
 * (settings.xml `<server>` blocks, or — non-standard — inline repo/mirror URLs),
 * so we can only scrub by *shape*, not by masking a known secret literal.
 *
 * Only the inline-`<url>` form (`https://user:token@host/…`) ever reaches
 * Maven's output; `<server>` credentials are applied as HTTP auth and never
 * printed. Maven emits the inline form on `Downloading from` / `Could not
 * transfer` lines (stdout), on both successful and failed downloads, and
 * aggregate builds can leave an earlier module's URLs in the partial output of
 * a later module's failure — so any at-risk message is routed through here.
 */
export function sanitiseCredentials(text: string): string {
  return (
    text
      // URL userinfo: `scheme://user:token@host/…` → `scheme://host/…`. Keep the
      // host (which repo is useful for debugging); drop only the credential.
      // `[^/\s]*@` consumes the whole authority-local userinfo up to its last
      // `@` and cannot cross a `/`, so an `@` in a path is left alone.
      .replace(/([a-zA-Z][a-zA-Z0-9+.-]*:\/\/)[^/\s]*@/g, '$1')
      // Auth headers Maven's HTTP wagon can echo under verbose/transport logging.
      .replace(
        /(Authorization:\s*(?:Basic|Bearer|Digest)\s+)\S+/gi,
        '$1<redacted>',
      )
  );
}
