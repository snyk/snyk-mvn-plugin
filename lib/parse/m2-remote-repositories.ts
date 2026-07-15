import * as fs from 'fs';
import * as path from 'path';
import * as subProcess from '../sub-process';
import type { MavenContext } from '../maven/context';
import { MAVEN_DEPENDENCY_PLUGIN_VERSION } from '../maven/version';
import { mapNodes, type M2Node } from './m2-batch';
import { debug } from '../index';

/**
 * A repository entry from `dependency:list-repositories`: its URL, plus its
 * `rank` — the 0-based position it appeared at in the output. `list-repositories`
 * prints repositories in Maven's search/priority order (project- and
 * dependency-declared repos before `central`), so a lower rank means a
 * higher-priority repository. When an artifact's _remote.repositories records
 * more than one repo id (see `parseRemoteRepositoriesFile`), the rank breaks the
 * tie: we credit the highest-priority (lowest-rank) recorded repo, matching the
 * repo Maven itself would have preferred.
 *
 * Caveat: rank is assigned by first occurrence across the whole (flat) output.
 * In an aggregate reactor the aggregator section often lists `central` first, so
 * `central` can grab rank 0 globally even though a child module declares a
 * higher-priority repo. That aggregate imprecision is rare, and the recorded
 * per-artifact repo signal is itself unreliable in multi-module builds sharing
 * one cache; the rank is exact wherever there is a single module (the common
 * case). The real fix would be per-module ranks, deliberately deferred.
 */
export interface RepositoryEntry {
  url: string;
  rank: number;
}

/**
 * Read the Maven remote repositories for a project by running
 * `mvn dependency:list-repositories` and parsing the output.
 *
 * The output lists all repositories available to the project, including those
 * configured in pom.xml, settings.xml, super-POMs, AND those introduced by
 * dependency POMs (e.g. a dependency that declares its own <repositories>). In
 * aggregate builds (multi-module), we capture repos from all modules and return
 * a union.
 *
 * Returns a Map<repositoryId, RepositoryEntry> for known repositories, or an
 * empty map if the command fails or produces no output. Never throws.
 */
export async function fetchRepositoryUrlMap(
  context: MavenContext,
  mavenAggregateProject: boolean,
  pluginVersion: string = MAVEN_DEPENDENCY_PLUGIN_VERSION,
  mavenArgs: string[] = [],
): Promise<Map<string, RepositoryEntry>> {
  const result = new Map<string, RepositoryEntry>();

  try {
    // Mirror the dependency-tree pipeline's invocation so we resolve the same
    // project's repositories: run from the Maven working directory, scope to the
    // target pom, and use --batch-mode to disable interactive prompts and
    // download-progress/colour noise that would break the line parsing below.
    //
    // Pin the plugin version rather than using the bare `dependency:` prefix:
    // the goal's output format is version-dependent — 3.6.1+ emits the
    // single-line ` * <id> (<url>, ...)` form the regex below parses, whereas
    // 2.x emits a multi-line `id:`/`url:` block we would not match (and 2.x
    // also omits some repositories entirely). Pinning to the same version the
    // rest of the pipeline uses keeps the output parseable and complete.
    const args = [
      `org.apache.maven.plugins:maven-dependency-plugin:${pluginVersion}:list-repositories`,
      '--batch-mode',
    ];

    if (context.targetFile && !mavenAggregateProject) {
      // if we are where we can execute - we preserve the original path;
      // if not - we rely on the executor (mvnw) to be spawned at the closest
      // directory, leaving us w/ the file itself.
      //
      // In aggregate (multi-module) builds we omit --file so Maven walks every
      // module and we capture the union of their repositories. We deliberately
      // do NOT use --non-recursive here: a child module's <repositories> are not
      // inherited by the aggregator, so a non-recursive run against the parent
      // would report only the parent's repos and miss module-specific ones. The
      // recursive run already prints a per-module section, which is enough to
      // union every repo id in play (running each module non-recursively would
      // spawn N subprocesses for the same information).
      if (context.root === context.workingDirectory) {
        args.push('--file', context.targetFile);
      } else {
        args.push('--file', path.basename(context.targetFile));
      }
    }

    // Forward the user's Maven args (the same ones passed to the resolve/tree
    // pipeline). This is required, not cosmetic: the repo ids recorded in
    // _remote.repositories are resolved from the effective
    // settings/profiles/mirrors, so if list-repositories runs under a different
    // config than the build that cached the artifacts, the ids won't line up and
    // the join drops the label (see the mirror handling below). Appended last to
    // mirror the dependency-tree pipeline's arg order.
    args.push(...mavenArgs);

    const stdout = await subProcess.execute(context.command, args, {
      cwd: context.workingDirectory,
    });

    // Parse repository entries from Maven output. A repo line looks like:
    //    * central (https://repo.maven.apache.org/maven2, default, releases)
    // and, when a mirror is active, carries a trailing mirror clause:
    //    * central (https://…/maven2, default, releases) mirrored by google-gcs-mirror (https://mirror/…, default, releases)
    //
    // We record BOTH the logical id and the mirror id, each mapped to its own
    // URL. This is essential, not redundant: the id written to an artifact's
    // _remote.repositories is the *mirror* id when a mirror is active (e.g.
    // `google-gcs-mirror`, not `central`), so keying only on the logical id
    // would never match a mirrored build and no label would be emitted. Mapping
    // each id to its own URL lets the recorded id pick the right source — the
    // mirror URL for a mirrored artifact, which is where the bytes came from.
    //
    // Group 1: repository/mirror id. Group 2: URL up to the first comma in parens.
    const repoLineRegex = /^\s+\*\s+(\S+)\s+\(([^,]+),/;
    const mirrorRegex = /\bmirrored by\s+(\S+)\s+\(([^,]+),/;
    const lines = stdout.split('\n');

    // Keep the first URL seen for a given id (duplicates should be rare) and
    // stamp it with the rank of that first occurrence — its position in the
    // priority-ordered output. `result.size` is the next free rank because we
    // only ever insert new ids here.
    const addRepo = (id: string, url: string): void => {
      if (!result.has(id)) {
        result.set(id, { url, rank: result.size });
        debug(`Found repository (rank ${result.size - 1}): ${id} -> ${url}`);
      }
    };

    for (const line of lines) {
      const match = line.match(repoLineRegex);
      if (!match) {
        continue;
      }
      addRepo(match[1], match[2]);

      const mirrorMatch = line.match(mirrorRegex);
      if (mirrorMatch) {
        addRepo(mirrorMatch[1], mirrorMatch[2]);
      }
    }
  } catch (err) {
    // If the command fails or produces an error, we'll work with an
    // empty map. Artifacts whose repos aren't in the map will simply
    // not get a distribution:url label (graceful degradation).
    debug(
      `Failed to fetch repository URLs: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }

  return result;
}

// Upper bound on the bytes read from a _remote.repositories file. Each line is
// a short `<filename>><repoId>=` record and a version directory lists only a
// handful of artifacts, so a real file is well under 1 KiB even for heavily
// classified artifacts. 64 KiB is generous headroom while stopping a
// misconfigured mirror that stored a large HTML error page at this path from
// being buffered wholesale. If a file somehow exceeds this we parse the prefix
// we read — the .jar/.pom records are listed near the top.
const MAX_REMOTE_REPOSITORIES_BYTES = 64 * 1024;

/**
 * Read the _remote.repositories file for a given artifact version directory.
 *
 * Maven writes this file when an artifact is installed from a remote repository.
 * Format: lines like `guava-32.1.3-jre.jar>central=`
 *
 * We read the repository IDs from the entry for the artifact we're reporting on
 * (`artifactFileName`, e.g. `guava-32.1.3-jre.jar`) — matching by exact filename
 * so a co-located `-sources.jar`/`-javadoc.jar` from a different repo can't win.
 * A single artifact can accumulate more than one id (a shared/warm cache appends
 * every repo it was ever resolved against), so we return ALL ids recorded for
 * that entry, in file order; the caller picks the highest-priority one by rank.
 * An empty id on that entry means the artifact was installed locally (no remote
 * source), so we report none rather than falling back. Falls back to the sibling
 * `.pom`'s ids only when the artifact's own entry is absent. Returns an empty
 * array if the file is absent, unparseable, or records no remote source.
 */
async function parseRemoteRepositoriesFile(
  filePath: string,
  artifactFileName: string,
): Promise<string[]> {
  let content: string;
  let handle: fs.promises.FileHandle | undefined;
  try {
    handle = await fs.promises.open(filePath, 'r');
    const buffer = Buffer.alloc(MAX_REMOTE_REPOSITORIES_BYTES);
    const { bytesRead } = await handle.read(
      buffer,
      0,
      MAX_REMOTE_REPOSITORIES_BYTES,
      0,
    );
    content = buffer.toString('utf8', 0, bytesRead);
  } catch {
    // File does not exist, is unreadable, or is malformed.
    // Return an empty array to signal "no remote repository recorded".
    return [];
  } finally {
    await handle?.close();
  }

  const lines = content.split('\n');

  // Sibling POM for the fallback, e.g. `foo-1.0.jar` -> `foo-1.0.pom`.
  const pomFileName = artifactFileName.replace(/\.[^.]+$/, '.pom');
  const artifactRepoIds: string[] = [];
  const pomRepoIds: string[] = [];
  let sawArtifactEntry = false;

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
    const repoId = parts[1].split('=')[0];

    // The artifact's own entry is authoritative. Collect every id recorded for
    // it. An empty id means it was installed locally; we track that the entry
    // exists (sawArtifactEntry) so we don't borrow the .pom's ids, but we don't
    // add the empty id itself.
    if (filename === artifactFileName) {
      sawArtifactEntry = true;
      if (repoId) {
        artifactRepoIds.push(repoId);
      }
      continue;
    }

    // Remember the sibling .pom's ids as a fallback for when the artifact's own
    // entry is absent.
    if (filename === pomFileName && repoId) {
      pomRepoIds.push(repoId);
    }
  }

  // The artifact's own entry wins outright when present (even if it recorded
  // only an empty local id); only fall back to the .pom when it is absent.
  if (sawArtifactEntry) {
    return artifactRepoIds;
  }
  return pomRepoIds;
}

/**
 * Read the repository IDs recorded for an artifact in its _remote.repositories
 * file. This is the I/O half of the distribution:url pass and depends only on
 * the local Maven repository — never on the fetched repo→URL map — so it can be
 * run concurrently with the dependency:list-repositories subprocess.
 *
 * Returns the recorded repository IDs (in file order), or an empty array if no
 * file/entry is present.
 */
export async function readRemoteRepositoryIds(node: M2Node): Promise<string[]> {
  // parseRemoteRepositoriesFile handles its own I/O errors and never throws;
  // the path operations here can't throw either, so no guard is needed.
  const versionDir = path.dirname(node.artifactPath);
  const remoteReposFile = path.join(versionDir, '_remote.repositories');
  const artifactFileName = path.basename(node.artifactPath);
  return parseRemoteRepositoriesFile(remoteReposFile, artifactFileName);
}

/**
 * Join an artifact's recorded repository IDs against the fetched repo→entry map
 * to construct its distribution:url label. Pure in-memory work — no I/O.
 *
 * When more than one id was recorded (a shared/warm cache accumulates every repo
 * the artifact was resolved against), we credit the highest-priority repo: a
 * single linear pass over the recorded ids picks the one with the lowest rank
 * (earliest in dependency:list-repositories' priority order). Ids absent from
 * the map are skipped, so an unmatched id degrades gracefully rather than losing
 * the label — a lower-priority-but-known repo can still win the URL.
 *
 * Returns `{ 'distribution:url': <url> }` when resolvable, empty object otherwise.
 */
export function buildDistributionUrlLabel(
  node: M2Node,
  repoIds: string[],
  repositoryPath: string,
  repoUrlMap: Map<string, RepositoryEntry>,
): Record<string, string> {
  let best: RepositoryEntry | undefined;
  for (const repoId of repoIds) {
    const entry = repoUrlMap.get(repoId);
    // undefined ⇒ id recorded in _remote.repositories but not in our fetched
    // map (e.g. cached by another project, or not in this project's
    // list-repositories); skip it and let a known repo win instead.
    if (entry && (!best || entry.rank < best.rank)) {
      best = entry;
    }
  }

  if (!best) {
    debug(
      `None of the recorded repository IDs [${repoIds.join(', ')}] for ${
        node.nodeId
      } were found in the fetched repo map`,
    );
    return {};
  }

  // Construct the full artifact URL by appending the relative path from the
  // repo root. Repo URLs from settings.xml/mirrors often carry a trailing
  // slash (e.g. `https://repo.maven.apache.org/maven2/`); strip it so we
  // don't emit a `…/maven2//com/google/…` double slash.
  const relativePath = path
    .relative(repositoryPath, node.artifactPath)
    .replace(/\\/g, '/');
  const fullUrl = `${best.url.replace(/\/+$/, '')}/${relativePath}`;
  debug(`Resolved distribution URL for ${node.nodeId}: ${fullUrl}`);
  return { 'distribution:url': fullUrl };
}

/**
 * Build the distribution:url label map for a set of nodes in two phases so the
 * file I/O overlaps the (slow, JVM-startup) dependency:list-repositories
 * subprocess:
 *
 *   1. Read every node's recorded repository ID from its _remote.repositories
 *      file — bounded-concurrency I/O that needs nothing from the subprocess.
 *   2. Once the repo→URL map resolves, join each ID to a URL in memory.
 *
 * `repoUrlMapPromise` is awaited only after phase 1's reads complete, so as long
 * as the caller kicks the subprocess off before calling this, the reads run
 * alongside it rather than serially after it.
 */
export async function buildRemoteRepositoryLabelMap(
  m2Nodes: M2Node[],
  repositoryPath: string,
  repoUrlMapPromise: Promise<Map<string, RepositoryEntry>>,
): Promise<Map<string, Record<string, string>>> {
  // Phase 1 — pure I/O, overlaps the subprocess. Keep only nodes whose
  // _remote.repositories recorded at least one repo id.
  const repoIdsByNode = await mapNodes(
    m2Nodes,
    (node) => readRemoteRepositoryIds(node),
    (repoIds) => repoIds.length > 0,
  );

  // Phase 2 — join against the fetched map (by now usually already resolved).
  const repoUrlMap = await repoUrlMapPromise;

  const result = new Map<string, Record<string, string>>();
  for (const node of m2Nodes) {
    const repoIds = repoIdsByNode.get(node.nodeId);
    if (!repoIds) {
      continue;
    }
    const label = buildDistributionUrlLabel(
      node,
      repoIds,
      repositoryPath,
      repoUrlMap,
    );
    if (Object.keys(label).length > 0) {
      result.set(node.nodeId, label);
    }
  }

  return result;
}
