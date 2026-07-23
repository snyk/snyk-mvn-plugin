import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { performance } from 'perf_hooks';
import { promisify } from 'util';
import { exec } from 'child_process';
import { PackageURL } from 'packageurl-js';
import type {
  MavenGraph,
  FingerprintOptions,
  FingerprintData,
  HashAlgorithm,
} from './parse/types';
import { parseDependency } from './parse/dependency';
import { debug } from './index';

const execAsync = promisify(exec);

/**
 * Get the Maven local repository path
 * Uses the same Maven command that's being used for dependency resolution
 */
export async function getMavenRepositoryPath(
  mavenCommand: string,
  providedPath?: string,
): Promise<string> {
  if (providedPath) {
    return providedPath;
  }

  try {
    // Use the same Maven command that's being used for dependency resolution
    const { stdout } = await execAsync(
      `${mavenCommand} help:evaluate -Dexpression=settings.localRepository -DforceStdout -q`,
    );
    const repoPath = stdout.trim();
    if (repoPath && fs.existsSync(repoPath)) {
      return repoPath;
    }
  } catch {
    // Fall back to default if Maven command fails
  }

  // Default Maven repository locations
  const homeDir = os.homedir();
  const defaultPath = path.join(homeDir, '.m2', 'repository');

  return defaultPath;
}

/**
 * Convert dependency ID to the expected artifact file path in the Maven
 * repository, or `undefined` if the coordinate would resolve OUTSIDE the
 * repository root.
 *
 * A dependency coordinate is untrusted input: node ids come from `mvn
 * dependency:tree` output, whose root node is the scanned project's own
 * groupId:artifactId:type:version straight from its pom.xml. Maven accepts a
 * version like `../../../../etc/passwd` (it only warns), so a crafted segment
 * can drive `path.join` out of the repository and turn the downstream `stat` /
 * read / hash into an arbitrary-file existence and content oracle. We therefore
 * reject any coordinate whose resolved path escapes `repositoryPath`.
 *
 * The containment check is relative to whatever `repositoryPath` was resolved
 * (the default `~/.m2/repository`, or a user-chosen `-Dmaven.repo.local=...` /
 * `mavenRepository`), so relocating the local repo — a trusted, deliberate
 * choice — keeps working; only coordinate-driven escapes out of the chosen base
 * are blocked.
 */
export function dependencyIdToArtifactPath(
  dependencyId: string,
  repositoryPath: string,
): string | undefined {
  const dep = parseDependency(dependencyId);

  // Segment guard: a well-formed Maven coordinate segment is never a path
  // separator or a `..` component. Reject those before building the path — `..`
  // would climb out of the repository, and an embedded separator would let a
  // coordinate inject arbitrary path structure. This matters even when the
  // containment check below passes: if repositoryPath is a broad root (e.g. a
  // custom `-Dmaven.repo.local=/`), containment is vacuous and segment shape is
  // the only thing keeping a coordinate on the expected group/artifact/version
  // layout. groupId maps its dots to separators by design, so it is validated
  // for raw separators only, not for the resulting path components.
  if (
    hasUnsafeSegment(dep.artifactId) ||
    hasUnsafeSegment(dep.version) ||
    hasUnsafeSegment(dep.type) ||
    (dep.classifier !== undefined && hasUnsafeSegment(dep.classifier)) ||
    /[/\\]/.test(dep.groupId)
  ) {
    return undefined;
  }

  // Convert groupId dots to path separators
  const groupPath = dep.groupId.replace(/\./g, path.sep);

  // Build the artifact filename
  // Format: artifactId-version[-classifier].type
  const classifierPart = dep.classifier ? `-${dep.classifier}` : '';
  const artifactFileName = `${dep.artifactId}-${dep.version}${classifierPart}.${dep.type}`;

  // Construct full path
  const artifactPath = path.join(
    repositoryPath,
    groupPath,
    dep.artifactId,
    dep.version,
    artifactFileName,
  );

  // Containment backstop: reject anything that still resolves outside
  // repositoryPath. Relative to whatever base was resolved, so a deliberately
  // relocated local repo keeps working while coordinate-driven escapes do not.
  const relativeToRepo = path.relative(
    path.resolve(repositoryPath),
    path.resolve(artifactPath),
  );
  if (relativeToRepo.startsWith('..') || path.isAbsolute(relativeToRepo)) {
    return undefined;
  }

  return artifactPath;
}

/**
 * True if a Maven coordinate segment contains a path separator or is a `..`
 * component — neither of which occurs in a legitimate groupId label,
 * artifactId, version, classifier or type, and both of which can steer the
 * constructed artifact path off the expected repository layout.
 */
function hasUnsafeSegment(segment: string): boolean {
  return segment === '..' || /[/\\]/.test(segment);
}

/**
 * Calculate fingerprint for a single file
 */
async function calculateFileFingerprint(
  filePath: string,
  algorithm: HashAlgorithm,
): Promise<string> {
  const hash = crypto.createHash(algorithm);
  const stream = fs.createReadStream(filePath);

  return new Promise((resolve, reject) => {
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Check if artifact file exists in the repository
 */
async function checkArtifactExists(
  artifactPath: string,
): Promise<{ exists: boolean; size?: number }> {
  try {
    const stats = await fs.promises.stat(artifactPath);
    return { exists: true, size: stats.size };
  } catch {
    return { exists: false };
  }
}

/**
 * Sanitize artifact path to show only the relative path within the repository
 */
function sanitizeArtifactPath(
  artifactPath: string,
  repositoryPath: string,
): string {
  if (artifactPath.startsWith(repositoryPath)) {
    // Remove the repository path prefix and any leading path separator
    return artifactPath.slice(repositoryPath.length).replace(/^[/\\]+/, '');
  }
  // Fallback to the full path if sanitization isn't possible
  return artifactPath;
}

/**
 * Process a single dependency ID to generate fingerprint
 */
async function processSingleDependency(
  dependencyId: string,
  repositoryPath: string,
  algorithm: HashAlgorithm,
): Promise<FingerprintData> {
  const startTime = performance.now();

  const artifactPath = dependencyIdToArtifactPath(dependencyId, repositoryPath);
  if (artifactPath === undefined) {
    // The coordinate resolves outside the repository (crafted traversal or an
    // otherwise malformed segment); refuse to touch the filesystem at all.
    return {
      hash: '',
      algorithm,
      filePath: '',
      fileSize: 0,
      processingTime: performance.now() - startTime,
      error: 'Artifact path escapes repository',
    };
  }

  // Sanitize the artifact path to show only the relative path within the repository
  const sanitizedPath = sanitizeArtifactPath(artifactPath, repositoryPath);

  try {
    const { exists, size } = await checkArtifactExists(artifactPath);

    if (!exists) {
      const endTime = performance.now();
      return {
        hash: '',
        algorithm,
        filePath: sanitizedPath,
        fileSize: 0,
        processingTime: endTime - startTime,
        error: 'Artifact not found in repository',
      };
    }

    const hash = await calculateFileFingerprint(artifactPath, algorithm);
    const endTime = performance.now();

    return {
      hash,
      algorithm,
      filePath: sanitizedPath,
      fileSize: size || 0,
      processingTime: endTime - startTime,
    };
  } catch (error) {
    const endTime = performance.now();

    return {
      hash: '',
      algorithm,
      filePath: sanitizedPath,
      fileSize: 0,
      processingTime: endTime - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process multiple dependency IDs with concurrency control
 */
async function processDependenciesConcurrently(
  dependencyIds: string[],
  repositoryPath: string,
  algorithm: HashAlgorithm,
  concurrency = 5,
): Promise<FingerprintData[]> {
  const results: FingerprintData[] = [];

  // Process dependencies in batches to control concurrency
  for (let i = 0; i < dependencyIds.length; i += concurrency) {
    const batch = dependencyIds.slice(i, i + concurrency);
    const batchPromises = batch.map((id) =>
      processSingleDependency(id, repositoryPath, algorithm),
    );
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Generate fingerprints for all unique dependencies in Maven graphs
 */
export async function generateFingerprints(
  mavenGraphs: MavenGraph[],
  options: FingerprintOptions,
  mavenCommand: string,
): Promise<Map<string, FingerprintData>> {
  const fingerprintMap = new Map<string, FingerprintData>();

  // Extract all unique node IDs from all graphs
  const allNodeIds = new Set<string>();
  for (const graph of mavenGraphs) {
    Object.keys(graph.nodes).forEach((nodeId) => allNodeIds.add(nodeId));
  }

  // Get Maven repository path using the same command
  const repositoryPath = await getMavenRepositoryPath(
    mavenCommand,
    options.mavenRepository,
  );

  // Process all unique dependencies with concurrency control
  const nodeIdArray = Array.from(allNodeIds);
  const results = await processDependenciesConcurrently(
    nodeIdArray,
    repositoryPath,
    options.algorithm,
    5, // Hardcoded concurrency limit
  );

  // Build the map
  for (let i = 0; i < nodeIdArray.length; i++) {
    fingerprintMap.set(nodeIdArray[i], results[i]);
  }

  return fingerprintMap;
}

export function reportFingerprintTiming(
  fingerprintMap: Map<string, FingerprintData>,
): void {
  const results = Array.from(fingerprintMap.values());

  // Don't report timing if there are no results
  if (results.length === 0) {
    return;
  }

  const processingTimes = results.map((r) => r.processingTime);
  const totalTime = processingTimes.reduce((sum, time) => sum + time, 0);
  const successful = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  debug('=== Fingerprint Timing Summary ===');
  debug(`Total artifacts: ${results.length}`);
  debug(`Successful: ${successful}`);
  debug(`Failed: ${failed}`);
  debug(`Total time: ${totalTime.toFixed(2)}ms`);
  debug(
    `Average time per artifact: ${(totalTime / results.length).toFixed(2)}ms`,
  );
  debug(`Fastest: ${Math.min(...processingTimes).toFixed(2)}ms`);
  debug(`Slowest: ${Math.max(...processingTimes).toFixed(2)}ms`);
  debug('=====================================');
}

/**
 * Generate Maven fingerprints with reporting
 */
export async function generateMavenFingerprints(
  mavenGraphs: MavenGraph[],
  fingerprintOptions: FingerprintOptions,
  mavenCommand: string,
): Promise<Map<string, FingerprintData>> {
  const fingerprintMap = await generateFingerprints(
    mavenGraphs,
    fingerprintOptions,
    mavenCommand,
  );

  reportFingerprintTiming(fingerprintMap);
  return fingerprintMap;
}

/**
 * Create a Maven PURL with checksum qualifier from dependency information and fingerprint data
 */
export function createMavenPurlWithChecksum(
  groupId: string,
  artifactId: string,
  version: string,
  fingerprintData?: FingerprintData,
  classifier?: string,
  type?: string,
): string {
  const standardQualifiers: Record<string, string> = {};

  if (classifier) {
    standardQualifiers.classifier = classifier;
  }

  if (type && type !== 'jar') {
    standardQualifiers.type = type;
  }

  // Add checksum qualifier to standard qualifiers
  if (fingerprintData && !fingerprintData.error && fingerprintData.hash) {
    const checksumValue = `${fingerprintData.algorithm.toLowerCase()}:${fingerprintData.hash.toLowerCase()}`;
    standardQualifiers.checksum = checksumValue;
  }

  const purl = new PackageURL(
    'maven',
    groupId,
    artifactId,
    version,
    Object.keys(standardQualifiers).length > 0 ? standardQualifiers : undefined,
    undefined, // subpath
  );

  return purl.toString();
}
