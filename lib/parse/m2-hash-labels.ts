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

// Number of artifacts whose companion files are read concurrently. Matches the
// concurrency limit used by `generateFingerprints` in fingerprint.ts.
const CONCURRENCY = 5;

/**
 * Read a single companion-file value. Returns undefined if the file does not
 * exist (older artifacts may not publish SHA-256/SHA-512). Returns the raw
 * hex digest, lowercased — Maven companion files contain the digest as ASCII
 * hex, sometimes followed by a space and the filename; we keep only the digest.
 */
async function readCompanionFile(
  artifactPath: string,
  ext: string,
): Promise<string | undefined> {
  const companionPath = `${artifactPath}.${ext}`;
  let raw: string;
  try {
    raw = (await fs.promises.readFile(companionPath, 'utf8')).trim();
  } catch {
    // File does not exist (older artifacts may not publish every algorithm) or
    // is unreadable — treat both as "no recorded hash for this algorithm".
    return undefined;
  }
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
export async function readM2HashLabels(
  dependencyId: string,
  repositoryPath: string,
): Promise<Record<string, string>> {
  const labels: Record<string, string> = {};
  const artifactPath = dependencyIdToArtifactPath(dependencyId, repositoryPath);

  const digests = await Promise.all(
    M2_COMPANION_FILES.map(({ ext }) => readCompanionFile(artifactPath, ext)),
  );

  M2_COMPANION_FILES.forEach(({ algorithm }, i) => {
    const digest = digests[i];
    if (digest) {
      labels[`hash:${algorithm}`] = digest;
    }
  });

  return labels;
}

/**
 * Pre-compute the hash-label map for every node in a set of Maven graphs.
 * Mirrors the pattern used by `generateFingerprints` so the depgraph builder
 * can attach labels without doing I/O inside the BFS/DFS loop. Reads are run
 * asynchronously in bounded batches so they never block the event loop.
 */
export async function buildM2HashLabelsMap(
  mavenGraphs: MavenGraph[],
  repositoryPath: string,
): Promise<Map<string, Record<string, string>>> {
  const result = new Map<string, Record<string, string>>();

  // Collect the unique node IDs across all graphs.
  const nodeIds = new Set<string>();
  for (const graph of mavenGraphs) {
    Object.keys(graph.nodes).forEach((nodeId) => nodeIds.add(nodeId));
  }
  const nodeIdArray = Array.from(nodeIds);

  // Read companion files in bounded-concurrency batches.
  for (let i = 0; i < nodeIdArray.length; i += CONCURRENCY) {
    const batch = nodeIdArray.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((nodeId) => readM2HashLabels(nodeId, repositoryPath)),
    );
    batch.forEach((nodeId, j) => {
      const labels = batchResults[j];
      if (Object.keys(labels).length > 0) {
        result.set(nodeId, labels);
      }
    });
  }

  return result;
}
