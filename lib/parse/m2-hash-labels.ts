import * as fs from 'fs';
import type { MavenGraph } from './types';
import { dependencyIdToArtifactPath } from '../fingerprint';

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
 * contents as depgraph labels keyed by `hash:<algorithm>` (using CycloneDX-style
 * algorithm names) for consumption by sbom-export.
 */

// Maps Maven companion-file extensions to the CycloneDX/SBOM hash-algorithm
// label suffix. The label key emitted is `hash:<suffix>`.
const M2_COMPANION_FILES: { ext: string; algorithm: string }[] = [
  { ext: 'md5', algorithm: 'md5' },
  { ext: 'sha1', algorithm: 'sha-1' },
  { ext: 'sha256', algorithm: 'sha-256' },
  { ext: 'sha512', algorithm: 'sha-512' },
];

/**
 * Read a single companion-file value. Returns undefined if the file does not
 * exist (older artifacts may not publish SHA-256/SHA-512). Returns the raw
 * hex digest, lowercased — Maven companion files contain the digest as ASCII
 * hex, sometimes followed by a space and the filename; we keep only the digest.
 */
function readCompanionFile(artifactPath: string, ext: string): string | undefined {
  const companionPath = `${artifactPath}.${ext}`;
  if (!fs.existsSync(companionPath)) {
    return undefined;
  }
  const raw = fs.readFileSync(companionPath, 'utf8').trim();
  // Maven sometimes formats as `<hex>  <filename>`; the first whitespace-delimited
  // token is the digest. Normalise to lowercase for a stable label value.
  const digest = raw.split(/\s+/, 1)[0];
  return digest.toLowerCase();
}

/**
 * Given a Maven dependency ID (e.g. "com.google.guava:guava:jar:32.1.3-jre"),
 * read whichever companion checksum files exist for it in the local Maven
 * repository and return them as `hash:<algorithm>` -> hex labels.
 *
 * Empty result if none are present (artifact not in .m2 yet, or no companion
 * files published).
 */
export function readM2HashLabels(
  dependencyId: string,
  repositoryPath: string,
): Record<string, string> {
  const labels: Record<string, string> = {};
  const artifactPath = dependencyIdToArtifactPath(dependencyId, repositoryPath);

  for (const { ext, algorithm } of M2_COMPANION_FILES) {
    const digest = readCompanionFile(artifactPath, ext);
    if (digest) {
      labels[`hash:${algorithm}`] = digest;
    }
  }

  return labels;
}

/**
 * Pre-compute the hash-label map for every node in a set of Maven graphs.
 * Mirrors the pattern used by `generateFingerprints` so the depgraph builder
 * can attach labels without doing I/O inside the BFS/DFS loop.
 */
export function buildM2HashLabelsMap(
  mavenGraphs: MavenGraph[],
  repositoryPath: string,
): Map<string, Record<string, string>> {
  const result = new Map<string, Record<string, string>>();
  const seen = new Set<string>();

  for (const graph of mavenGraphs) {
    for (const nodeId of Object.keys(graph.nodes)) {
      if (seen.has(nodeId)) continue;
      seen.add(nodeId);
      const labels = readM2HashLabels(nodeId, repositoryPath);
      if (Object.keys(labels).length > 0) {
        result.set(nodeId, labels);
      }
    }
  }

  return result;
}
