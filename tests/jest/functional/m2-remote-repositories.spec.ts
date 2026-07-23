import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { dependencyIdToArtifactPath } from '../../../lib/fingerprint';
import {
  buildRemoteRepositoryLabelMap,
  type RepositoryEntry,
} from '../../../lib/parse/m2-remote-repositories';
import type { M2Node } from '../../../lib/parse/m2-batch';

// Build a repo→entry map from ordered [id, url] pairs, stamping rank by position
// so the first pair is the highest priority — mirroring how fetchRepositoryUrlMap
// ranks dependency:list-repositories output.
function rankedMap(...pairs: [string, string][]): Map<string, RepositoryEntry> {
  return new Map(pairs.map(([id, url], rank) => [id, { url, rank }]));
}

// dependencyIdToArtifactPath returns undefined only for coordinates that escape
// the repository; every coordinate in these tests is well-formed, so assert a
// path is produced and keep the call sites typed as string.
function artifactPathFor(dependencyId: string, repositoryPath: string): string {
  const artifactPath = dependencyIdToArtifactPath(dependencyId, repositoryPath);
  if (artifactPath === undefined) {
    throw new Error(`expected a path for ${dependencyId}`);
  }
  return artifactPath;
}

// Resolve the label for a single node through the production path
// (buildRemoteRepositoryLabelMap), returning {} when no label is emitted. Keeps
// the per-node assertions below exercising the code that actually ships.
async function labelFor(
  node: M2Node,
  repositoryPath: string,
  urlMap: Map<string, RepositoryEntry>,
): Promise<Record<string, string>> {
  const map = await buildRemoteRepositoryLabelMap(
    [node],
    repositoryPath,
    Promise.resolve(urlMap),
  );
  return map.get(node.nodeId) ?? {};
}

describe('distribution:url label emission from .m2 _remote.repositories files', () => {
  let repoRoot: string;
  let node: M2Node;

  const depId = 'com.example:foo:jar:1.0';
  const expectedUrl =
    'https://repo.maven.apache.org/maven2/com/example/foo/1.0/foo-1.0.jar';

  beforeAll(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'snyk-mvn-remote-'));

    // Stand up a fake installed artifact plus the _remote.repositories file
    // Maven writes alongside it, recording the repo the jar came from.
    const artifactPath = artifactPathFor(depId, repoRoot);
    const dir = path.dirname(artifactPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(artifactPath, 'fake jar contents');
    fs.writeFileSync(
      path.join(dir, '_remote.repositories'),
      // A leading comment line (Maven writes a header + timestamp), the pom
      // entry, then the jar entry — the jar is preferred.
      `#NOTE: internal Maven Resolver file\nfoo-1.0.pom>central=\nfoo-1.0.jar>central=\n`,
    );

    node = { nodeId: depId, artifactPath };
  });

  afterAll(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('builds the artifact URL from the repo URL and the repo-relative path', async () => {
    const labels = await labelFor(
      node,
      repoRoot,
      rankedMap(['central', 'https://repo.maven.apache.org/maven2']),
    );
    expect(labels['distribution:url']).toBe(expectedUrl);
  });

  it('does not emit a double slash when the repo URL has a trailing slash', async () => {
    const labels = await labelFor(
      node,
      repoRoot,
      rankedMap(['central', 'https://repo.maven.apache.org/maven2/']),
    );
    expect(labels['distribution:url']).toBe(expectedUrl);
  });

  it('returns no label when the recorded repo id is not in the URL map', async () => {
    const labels = await labelFor(node, repoRoot, new Map());
    expect(labels).toEqual({});
  });

  it('returns no label when there is no _remote.repositories file', async () => {
    const otherDepId = 'com.example:bar:jar:2.0';
    const otherNode: M2Node = {
      nodeId: otherDepId,
      artifactPath: artifactPathFor(otherDepId, repoRoot),
    };
    const labels = await labelFor(
      otherNode,
      repoRoot,
      rankedMap(['central', 'https://repo.maven.apache.org/maven2']),
    );
    expect(labels).toEqual({});
  });

  it('ignores a co-located -sources.jar recorded against a different repo', async () => {
    const depId = 'com.example:classified:jar:1.0';
    const artifactPath = artifactPathFor(depId, repoRoot);
    const dir = path.dirname(artifactPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(artifactPath, 'fake jar contents');
    // The sources jar (from `other`) is listed before the main jar (`central`);
    // the main artifact's own entry must win, not the first jar-like line.
    fs.writeFileSync(
      path.join(dir, '_remote.repositories'),
      `#NOTE: internal Maven Resolver file\nclassified-1.0-sources.jar>other=\nclassified-1.0.jar>central=\n`,
    );

    const labels = await labelFor(
      { nodeId: depId, artifactPath },
      repoRoot,
      rankedMap(
        ['central', 'https://repo.maven.apache.org/maven2'],
        ['other', 'https://other.example/maven2'],
      ),
    );
    expect(labels['distribution:url']).toBe(
      'https://repo.maven.apache.org/maven2/com/example/classified/1.0/classified-1.0.jar',
    );
  });

  it('emits no label when the artifact was installed locally (empty repo id)', async () => {
    const depId = 'com.example:local:jar:1.0';
    const artifactPath = artifactPathFor(depId, repoRoot);
    const dir = path.dirname(artifactPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(artifactPath, 'fake jar contents');
    // Jar installed locally (empty id) but the pom came from central: the jar's
    // own entry is authoritative, so we must not claim it came from central.
    fs.writeFileSync(
      path.join(dir, '_remote.repositories'),
      `#NOTE: internal Maven Resolver file\nlocal-1.0.pom>central=\nlocal-1.0.jar>=\n`,
    );

    const labels = await labelFor(
      { nodeId: depId, artifactPath },
      repoRoot,
      rankedMap(['central', 'https://repo.maven.apache.org/maven2']),
    );
    expect(labels).toEqual({});
  });

  it('credits the highest-priority repo when a jar records multiple repo ids', async () => {
    // Shared/warm cache: the jar accumulated both ids. list-repositories ranks
    // jboss above central, so the label must resolve to jboss (rank 0), not
    // whichever id happens to appear first in the file.
    const depId = 'com.example:multi:jar:1.0';
    const artifactPath = artifactPathFor(depId, repoRoot);
    const dir = path.dirname(artifactPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(artifactPath, 'fake jar contents');
    // central is written first in the file; jboss second. File order must not
    // decide the winner — rank does.
    fs.writeFileSync(
      path.join(dir, '_remote.repositories'),
      `#NOTE: internal Maven Resolver file\nmulti-1.0.jar>central=\nmulti-1.0.jar>jboss=\n`,
    );

    const labels = await labelFor(
      { nodeId: depId, artifactPath },
      repoRoot,
      rankedMap(
        ['jboss', 'https://repository.jboss.org/nexus/content/groups/public/'],
        ['central', 'https://repo.maven.apache.org/maven2'],
      ),
    );
    expect(labels['distribution:url']).toBe(
      'https://repository.jboss.org/nexus/content/groups/public/com/example/multi/1.0/multi-1.0.jar',
    );
  });

  it('falls back to a lower-priority recorded id when the top one is absent from the map', async () => {
    // The jar records [jboss, central] but the fetched map only knows central
    // (jboss missing, e.g. cached by another project). Rather than lose the
    // label, we credit the known lower-priority repo.
    const depId = 'com.example:partial:jar:1.0';
    const artifactPath = artifactPathFor(depId, repoRoot);
    const dir = path.dirname(artifactPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(artifactPath, 'fake jar contents');
    fs.writeFileSync(
      path.join(dir, '_remote.repositories'),
      `#NOTE: internal Maven Resolver file\npartial-1.0.jar>jboss=\npartial-1.0.jar>central=\n`,
    );

    const labels = await labelFor(
      { nodeId: depId, artifactPath },
      repoRoot,
      rankedMap(['central', 'https://repo.maven.apache.org/maven2']),
    );
    expect(labels['distribution:url']).toBe(
      'https://repo.maven.apache.org/maven2/com/example/partial/1.0/partial-1.0.jar',
    );
  });
});

describe('buildRemoteRepositoryLabelMap two-phase build', () => {
  let repoRoot: string;
  let fooNode: M2Node; // has a _remote.repositories recording `central`
  let jbossNode: M2Node; // records a repo id absent from the url map
  let noFileNode: M2Node; // installed jar but no _remote.repositories file

  const urlMap = rankedMap(['central', 'https://repo.maven.apache.org/maven2']);

  function install(depId: string, repoId?: string): M2Node {
    const artifactPath = artifactPathFor(depId, repoRoot);
    const dir = path.dirname(artifactPath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(artifactPath, 'fake jar contents');
    if (repoId) {
      const jarName = path.basename(artifactPath);
      fs.writeFileSync(
        path.join(dir, '_remote.repositories'),
        `#NOTE: internal Maven Resolver file\n${jarName}>${repoId}=\n`,
      );
    }
    return { nodeId: depId, artifactPath };
  }

  beforeAll(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'snyk-mvn-remote-map-'));
    fooNode = install('com.example:foo:jar:1.0', 'central');
    jbossNode = install('com.example:jboss-dep:jar:2.0', 'jboss');
    noFileNode = install('com.example:nofile:jar:3.0');
  });

  afterAll(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('joins recorded repo ids to urls, dropping unmatched and file-less nodes', async () => {
    const map = await buildRemoteRepositoryLabelMap(
      [fooNode, jbossNode, noFileNode],
      repoRoot,
      Promise.resolve(urlMap),
    );

    expect(map.get(fooNode.nodeId)).toEqual({
      'distribution:url':
        'https://repo.maven.apache.org/maven2/com/example/foo/1.0/foo-1.0.jar',
    });
    // jboss recorded but not in the url map, nofile has no _remote.repositories.
    expect(map.has(jbossNode.nodeId)).toBe(false);
    expect(map.has(noFileNode.nodeId)).toBe(false);
    expect(map.size).toBe(1);
  });

  it('reads the _remote.repositories files before the url map resolves', async () => {
    // Phase 1 (file I/O) must not be gated on the url map — that is what lets it
    // overlap the dependency:list-repositories subprocess. Prove it by handing in
    // an unresolved promise and asserting the reads have already happened.
    const openSpy = jest.spyOn(fs.promises, 'open');

    let mapResolved = false;
    let resolveMap!: (m: Map<string, RepositoryEntry>) => void;
    const pendingMap = new Promise<Map<string, RepositoryEntry>>((resolve) => {
      resolveMap = (m) => {
        mapResolved = true;
        resolve(m);
      };
    });

    const resultPromise = buildRemoteRepositoryLabelMap(
      [fooNode],
      repoRoot,
      pendingMap,
    );

    // Let phase 1's batched reads run without resolving the map.
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));

    expect(openSpy).toHaveBeenCalled();
    expect(mapResolved).toBe(false);

    resolveMap(urlMap);
    const map = await resultPromise;
    expect(map.get(fooNode.nodeId)?.['distribution:url']).toBe(
      'https://repo.maven.apache.org/maven2/com/example/foo/1.0/foo-1.0.jar',
    );

    openSpy.mockRestore();
  });
});
