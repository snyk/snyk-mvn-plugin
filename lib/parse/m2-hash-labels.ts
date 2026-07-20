import * as fs from 'fs';
import { debug } from '../index';

/**
 * Read install-time-recorded hashes from the Maven local repository.
 *
 * For each artifact in `~/.m2/repository/.../`, Maven stores the JAR alongside
 * companion checksum files (`<artifact>.jar.sha1`, `.md5`, `.sha256`, sometimes
 * `.sha512`). Those files came from the upstream Maven repository at install
 * time and Maven verified them against the JAR bytes before saving. They are
 * therefore the install-time-recorded hash of the artifact the customer's
 * Maven received.
 *
 * This module reads those files (no hashing happens here) and surfaces the
 * contents as depgraph labels keyed by `hash:<algorithm>`, where `<algorithm>`
 * is a lowercase-normalized name (`md5`, `sha-1`, `sha-256`, `sha-512`). The
 * downstream consumer maps these to the CycloneDX/SPDX algorithm names it
 * requires.
 */

// Maps Maven companion-file extensions to the CycloneDX/SBOM hash-algorithm
// label suffix (the label key emitted is `hash:<algorithm>`) and the pattern a
// valid digest of that algorithm must match: exactly N lowercase hex chars.
// The patterns are compiled once here, not per file. They carry no global/
// sticky flag, so they hold no mutable `lastIndex` state and a single shared
// instance is safe to reuse across the concurrent reads below.
const M2_COMPANION_FILES: {
  ext: string;
  algorithm: string;
  digestPattern: RegExp;
}[] = [
  { ext: 'md5', algorithm: 'md5', digestPattern: /^[0-9a-f]{32}$/ },
  { ext: 'sha1', algorithm: 'sha-1', digestPattern: /^[0-9a-f]{40}$/ },
  { ext: 'sha256', algorithm: 'sha-256', digestPattern: /^[0-9a-f]{64}$/ },
  { ext: 'sha512', algorithm: 'sha-512', digestPattern: /^[0-9a-f]{128}$/ },
];

// Upper bound on the bytes read from a companion file. We only keep the first
// whitespace-delimited token, and the longest valid digest is sha-512 at 128
// hex chars; 256 bytes leaves slack for a leading BOM/whitespace while still
// reaching that token. Reading a small prefix rather than the whole file stops
// a misconfigured mirror that stored a large HTML error page from being
// buffered wholesale — anything past the first token is irrelevant.
const MAX_COMPANION_BYTES = 256;

// Result of reading a single companion file. `found` distinguishes "the file
// doesn't exist" from "the file exists but its contents are not a usable
// digest" — both yield no `digest`, but callers need to tell the two apart to
// avoid reporting a corrupt/invalid companion file as merely "not present".
interface CompanionFileResult {
  found: boolean;
  digest?: string;
}

/**
 * Read a single companion-file value. `found` is false if the file does not
 * exist (older artifacts may not publish every algorithm) or is unreadable;
 * otherwise true. `digest` is set only if the file was found and its contents
 * are a valid digest for the algorithm.
 *
 * Maven companion files contain the digest as ASCII hex, sometimes followed by a
 * space and the filename; we keep only the first whitespace-delimited token. The
 * token is rejected unless it matches `digestPattern` (the algorithm's exact
 * lowercase-hex shape) — a misconfigured mirror can store an HTML error page or
 * truncated body in a companion file, and we must not surface that as a hash.
 */
async function readCompanionFile(
  artifactPath: string,
  ext: string,
  digestPattern: RegExp,
): Promise<CompanionFileResult> {
  const companionPath = `${artifactPath}.${ext}`;
  let raw: string;
  let handle: fs.promises.FileHandle | undefined;
  try {
    handle = await fs.promises.open(companionPath, 'r');
    const buffer = Buffer.alloc(MAX_COMPANION_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, MAX_COMPANION_BYTES, 0);
    raw = buffer.toString('utf8', 0, bytesRead).trim();
  } catch {
    // File does not exist (older artifacts may not publish every algorithm) or
    // is unreadable — treat both as "no recorded hash for this algorithm".
    return { found: false };
  } finally {
    await handle?.close();
  }
  const digest = raw.split(/\s+/, 1)[0].toLowerCase();
  if (!digestPattern.test(digest)) {
    debug(
      `Ignoring ${ext} companion file ${companionPath}: ` +
        `contents are not a valid digest`,
    );
    return { found: true };
  }
  return { found: true, digest };
}

/**
 * Given the path to an artifact in the local Maven repository, read whichever
 * companion checksum files exist for it and return them as
 * `hash:<algorithm>` -> hex labels.
 *
 * Empty result if none are present (artifact not in .m2 yet, or no companion
 * files published).
 */
export async function readM2HashLabels(
  artifactPath: string,
): Promise<Record<string, string>> {
  const labels: Record<string, string> = {};

  const results = await Promise.all(
    M2_COMPANION_FILES.map(({ ext, digestPattern }) =>
      readCompanionFile(artifactPath, ext, digestPattern),
    ),
  );

  M2_COMPANION_FILES.forEach(({ algorithm }, i) => {
    const { digest } = results[i];
    if (digest) {
      labels[`hash:${algorithm}`] = digest;
    }
  });

  if (results.every((result) => !result.found)) {
    debug(`No companion checksum files found for ${artifactPath}`);
  }

  return labels;
}
