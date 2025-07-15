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
 * Convert dependency ID to the expected artifact file path in Maven repository
 */
export function dependencyIdToArtifactPath(
  dependencyId: string,
  repositoryPath: string,
): string {
  const dep = parseDependency(dependencyId);

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

  return artifactPath;
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

  try {
    const artifactPath = dependencyIdToArtifactPath(
      dependencyId,
      repositoryPath,
    );
    const { exists, size } = await checkArtifactExists(artifactPath);

    // Sanitize the artifact path to show only the relative path within the repository
    const sanitizedPath = sanitizeArtifactPath(artifactPath, repositoryPath);

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
    const artifactPath = dependencyIdToArtifactPath(
      dependencyId,
      repositoryPath,
    );
    const sanitizedPath = sanitizeArtifactPath(artifactPath, repositoryPath);

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
    options.concurrency || 5,
  );

  // Build the map
  for (let i = 0; i < nodeIdArray.length; i++) {
    fingerprintMap.set(nodeIdArray[i], results[i]);
  }

  return fingerprintMap;
}

/**
 * Report fingerprint timing information to stdout
 */
export function reportFingerprintTiming(
  fingerprintMap: Map<string, FingerprintData>,
): void {
  const results = Array.from(fingerprintMap.values());
  const processingTimes = results.map((r) => r.processingTime);
  const totalTime = processingTimes.reduce((sum, time) => sum + time, 0);
  const successful = results.filter((r) => !r.error).length;
  const failed = results.filter((r) => r.error).length;

  console.log('\n=== Fingerprint Timing Summary ===');
  console.log(`Total artifacts: ${results.length}`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total time: ${totalTime.toFixed(2)}ms`);
  console.log(
    `Average time per artifact: ${(totalTime / results.length).toFixed(2)}ms`,
  );
  console.log(`Fastest: ${Math.min(...processingTimes).toFixed(2)}ms`);
  console.log(`Slowest: ${Math.max(...processingTimes).toFixed(2)}ms`);
  console.log('=====================================\n');
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

  const purl = new PackageURL(
    'maven',
    groupId,
    artifactId,
    version,
    Object.keys(standardQualifiers).length > 0 ? standardQualifiers : undefined,
    undefined, // subpath
  );

  // Get base PURL string
  let purlStr = purl.toString();

  // Add checksum qualifier manually to avoid colon encoding
  if (fingerprintData && !fingerprintData.error && fingerprintData.hash) {
    const checksumValue = `${fingerprintData.algorithm.toLowerCase()}:${fingerprintData.hash.toLowerCase()}`;
    const checksumQualifier = `checksum=${checksumValue}`;

    if (purlStr.includes('?')) {
      // Already has qualifiers, append with &
      purlStr += `&${checksumQualifier}`;
    } else {
      // No qualifiers yet, add with ?
      purlStr += `?${checksumQualifier}`;
    }
  }

  return purlStr;
}
