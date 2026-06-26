import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { dependencyIdToArtifactPath } from '../../../lib/fingerprint';
import { readRemoteRepositoryLabel } from '../../../lib/parse/m2-remote-repositories';
import type { M2Node } from '../../../lib/parse/m2-batch';

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
    const artifactPath = dependencyIdToArtifactPath(depId, repoRoot);
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
    const labels = await readRemoteRepositoryLabel(
      node,
      repoRoot,
      new Map([['central', 'https://repo.maven.apache.org/maven2']]),
    );
    expect(labels['distribution:url']).toBe(expectedUrl);
  });

  it('does not emit a double slash when the repo URL has a trailing slash', async () => {
    const labels = await readRemoteRepositoryLabel(
      node,
      repoRoot,
      new Map([['central', 'https://repo.maven.apache.org/maven2/']]),
    );
    expect(labels['distribution:url']).toBe(expectedUrl);
  });

  it('returns no label when the recorded repo id is not in the URL map', async () => {
    const labels = await readRemoteRepositoryLabel(node, repoRoot, new Map());
    expect(labels).toEqual({});
  });

  it('returns no label when there is no _remote.repositories file', async () => {
    const otherDepId = 'com.example:bar:jar:2.0';
    const otherNode: M2Node = {
      nodeId: otherDepId,
      artifactPath: dependencyIdToArtifactPath(otherDepId, repoRoot),
    };
    const labels = await readRemoteRepositoryLabel(
      otherNode,
      repoRoot,
      new Map([['central', 'https://repo.maven.apache.org/maven2']]),
    );
    expect(labels).toEqual({});
  });
});
