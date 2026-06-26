import * as fs from 'fs';
import * as path from 'path';
import * as subProcess from '../sub-process';
import type { MavenGraph } from './types';
import type { MavenContext } from '../maven/context';
import { dependencyIdToArtifactPath } from '../fingerprint';
import { debug } from '../index';

/**
 * Read the Maven remote repositories for a project by running
 * `mvn dependency:list-repositories` and parsing the output.
 *
 * The output lists all repositories available to the project, including those
 * configured in pom.xml, settings.xml, and super-POMs. In aggregate builds
 * (multi-module), we capture repos from all modules and return a union.
 *
 * Returns a Map<repositoryId, repositoryUrl> for known repositories, or an
 * empty map if the command fails or produces no output. Never throws.
 */
export async function fetchRepositoryUrlMap(
  context: MavenContext,
  mavenAggregateProject: boolean,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  try {
    // Mirror the dependency-tree pipeline's invocation so we resolve the same
    // project's repositories: run from the Maven working directory, scope to the
    // target pom, and use --batch-mode to disable interactive prompts and
    // download-progress/colour noise that would break the line parsing below.
    const args = ['dependency:list-repositories', '--batch-mode'];

    if (context.targetFile && !mavenAggregateProject) {
      // if we are where we can execute - we preserve the original path;
      // if not - we rely on the executor (mvnw) to be spawned at the closest
      // directory, leaving us w/ the file itself.
      // In aggregate (multi-module) builds we omit --file so Maven walks every
      // module and we capture the union of their repositories.
      if (context.root === context.workingDirectory) {
        args.push('--file', context.targetFile);
      } else {
        args.push('--file', path.basename(context.targetFile));
      }
    }

    const stdout = await subProcess.execute(context.command, args, {
      cwd: context.workingDirectory,
    });

    // Parse repository entries from Maven output.
    // Format: ` * <id> (<url>, <layout>, <policy>)`
    // We match lines that don't start with [INFO] (the repo entries).
    // A regex like `/^\s+\*\s+(\S+)\s+\(([^,]+),/` captures:
    // - Group 1: repository id
    // - Group 2: repository url (everything before the first comma inside parens)
    const repoLineRegex = /^\s+\*\s+(\S+)\s+\(([^,]+),/m;
    const lines = stdout.split('\n');

    for (const line of lines) {
      const match = line.match(repoLineRegex);
      if (!match) {
        continue;
      }
      const repoId = match[1];
      const repoUrl = match[2];

      // Skip if we've already seen this repo ID (should be rare, but
      // in the case of duplicate repo IDs we keep the first occurrence).
      if (!result.has(repoId)) {
        result.set(repoId, repoUrl);
        debug(`Found repository: ${repoId} -> ${repoUrl}`);
      }
    }
  } catch (err) {
    // If the command fails or produces an error, we'll work with an
    // empty map. Artifacts whose repos aren't in the map will simply
    // not get a distribution:url label (graceful degradation).
    debug(
      `Failed to fetch repository URLs: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return result;
}

/**
 * Read the _remote.repositories file for a given artifact version directory.
 *
 * Maven writes this file when an artifact is installed from a remote repository.
 * Format: lines like `guava-32.1.3-jre.jar>central=`
 *
 * We prefer to read the repository ID from the `.jar` (or `.aar`, `.war`, `.ear`)
 * entry, as that's the artifact we're reporting on. Falls back to `.pom` if no
 * binary artifact entry is found. Returns undefined if the file is absent or
 * unparseable.
 */
async function parseRemoteRepositoriesFile(
  filePath: string,
): Promise<string | undefined> {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const lines = content.split('\n');

    let pomRepoId: string | undefined;

    for (const line of lines) {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      // Parse: `<filename>><repoId>=`
      const parts = trimmed.split('>');
      if (parts.length !== 2) {
        continue;
      }
      const filename = parts[0];
      const repoAndRest = parts[1];
      const repoId = repoAndRest.split('=')[0];

      if (!repoId) {
        continue;
      }

      // Prefer JAR-like artifacts over .pom
      if (
        filename.endsWith('.jar') ||
        filename.endsWith('.aar') ||
        filename.endsWith('.war') ||
        filename.endsWith('.ear')
      ) {
        return repoId;
      }

      // Remember .pom as a fallback
      if (filename.endsWith('.pom') && !pomRepoId) {
        pomRepoId = repoId;
      }
    }

    // Return .pom repo ID if no binary artifact was found
    if (pomRepoId) {
      return pomRepoId;
    }
  } catch {
    // File does not exist, is unreadable, or is malformed.
    // Return undefined to signal "no remote repository recorded".
  }

  return undefined;
}

/**
 * Given a Maven dependency ID, read its _remote.repositories file (if present),
 * extract the repository ID, look it up in the provided URL map, and construct
 * the full artifact URL.
 *
 * Returns `{ 'distribution:url': <url> }` when resolvable, empty object otherwise.
 */
async function readRemoteRepositoryLabel(
  dependencyId: string,
  repositoryPath: string,
  repoUrlMap: Map<string, string>,
): Promise<Record<string, string>> {
  const labels: Record<string, string> = {};

  try {
    const artifactPath = dependencyIdToArtifactPath(
      dependencyId,
      repositoryPath,
    );
    const versionDir = path.dirname(artifactPath);
    const remoteReposFile = path.join(versionDir, '_remote.repositories');

    const repoId = await parseRemoteRepositoriesFile(remoteReposFile);
    if (!repoId) {
      return labels;
    }

    const repoUrl = repoUrlMap.get(repoId);
    if (!repoUrl) {
      // Repo ID found in _remote.repositories but not in our fetched URL map.
      // This can happen if the artifact was cached by another project or if the
      // repository is not listed in the current project's dependency:list-repositories.
      // Gracefully degrade: no distribution:url label for this artifact.
      debug(
        `Repository ID '${repoId}' from ${remoteReposFile} not found in fetched repo map`,
      );
      return labels;
    }

    // Construct the full artifact URL by appending the relative path from the repo root.
    const relativePath = path
      .relative(repositoryPath, artifactPath)
      .replace(/\\/g, '/');
    const fullUrl = `${repoUrl}/${relativePath}`;
    labels['distribution:url'] = fullUrl;

    debug(
      `Resolved distribution URL for ${dependencyId}: ${fullUrl}`,
    );
  } catch (err) {
    // Any unexpected error: just skip the label.
    debug(
      `Failed to read remote repository label for ${dependencyId}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  return labels;
}

/**
 * Number of artifacts processed per batch. We batch to avoid spawning too many
 * concurrent file reads.
 */
const CONCURRENCY = 5;

/**
 * Pre-compute the distribution-URL label map for every node in a set of Maven
 * graphs. Returns Map<nodeId, { 'distribution:url': url }>, only storing entries
 * where a URL was successfully resolved.
 */
export async function buildRemoteRepositoriesMap(
  mavenGraphs: MavenGraph[],
  repositoryPath: string,
  repoUrlMap: Map<string, string>,
): Promise<Map<string, Record<string, string>>> {
  const result = new Map<string, Record<string, string>>();

  // Collect the unique node IDs across all graphs.
  const nodeIds = new Set<string>();
  for (const graph of mavenGraphs) {
    Object.keys(graph.nodes).forEach((nodeId) => nodeIds.add(nodeId));
  }
  const nodeIdArray = Array.from(nodeIds);

  // Read _remote.repositories files in bounded-concurrency batches.
  for (let i = 0; i < nodeIdArray.length; i += CONCURRENCY) {
    const batch = nodeIdArray.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((nodeId) =>
        readRemoteRepositoryLabel(nodeId, repositoryPath, repoUrlMap),
      ),
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
