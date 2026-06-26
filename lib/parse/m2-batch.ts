import type { MavenGraph } from './types';
import { dependencyIdToArtifactPath } from '../fingerprint';

/**
 * Number of artifacts processed per batch. We batch to avoid spawning too many
 * concurrent file reads. Note a single node may itself fan out into several
 * reads (e.g. one companion file per hash algorithm), so the in-flight read
 * count can be a small multiple of this.
 */
export const CONCURRENCY = 5;

/**
 * A Maven graph node paired with the path to its artifact in the local Maven
 * repository. Resolved once via {@link collectM2Nodes} so the hash-label and
 * distribution-url passes can share it rather than each recomputing it.
 */
export interface M2Node {
  nodeId: string;
  artifactPath: string;
}

/**
 * Collect the unique node IDs across all graphs and resolve each to its
 * artifact path in the local Maven repository. Done once so every per-node
 * pass (hashes, distribution URLs) can reuse the same node set and paths.
 */
export function collectM2Nodes(
  mavenGraphs: MavenGraph[],
  repositoryPath: string,
): M2Node[] {
  const nodeIds = new Set<string>();
  for (const graph of mavenGraphs) {
    Object.keys(graph.nodes).forEach((nodeId) => nodeIds.add(nodeId));
  }
  return Array.from(nodeIds).map((nodeId) => ({
    nodeId,
    artifactPath: dependencyIdToArtifactPath(nodeId, repositoryPath),
  }));
}

/**
 * Run `readLabels` for every node in bounded-concurrency batches and return a
 * Map<nodeId, labels> containing only the nodes that produced a non-empty label
 * set. Reads run asynchronously in bounded batches so they never block the
 * event loop. The shared scaffold for any per-node label-reading pass.
 */
export async function buildLabelMap(
  nodes: M2Node[],
  readLabels: (node: M2Node) => Promise<Record<string, string>>,
): Promise<Map<string, Record<string, string>>> {
  const result = new Map<string, Record<string, string>>();

  for (let i = 0; i < nodes.length; i += CONCURRENCY) {
    const batch = nodes.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(readLabels));
    batch.forEach((node, j) => {
      const labels = batchResults[j];
      if (Object.keys(labels).length > 0) {
        result.set(node.nodeId, labels);
      }
    });
  }

  return result;
}
