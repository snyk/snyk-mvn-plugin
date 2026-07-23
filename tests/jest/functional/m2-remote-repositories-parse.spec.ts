import * as subProcess from '../../../lib/sub-process';
import { fetchRepositoryUrlMap } from '../../../lib/parse/m2-remote-repositories';
import type { MavenContext } from '../../../lib/maven/context';

jest.mock('../../../lib/sub-process');

const mockedExecute = subProcess.execute as jest.MockedFunction<
  typeof subProcess.execute
>;

const context: MavenContext = {
  command: 'mvn',
  workingDirectory: '/project',
  root: '/project',
  targetFile: 'pom.xml',
  targetPath: '/project/pom.xml',
};

// Captured verbatim from `mvn dependency:list-repositories --batch-mode` on a
// maven-dependency-plugin 3.x invocation. Repo entries are single ` * <id> (<url>,
// <layout>, <policy>)` lines with no `[INFO]` prefix; everything else is noise the
// parser must skip.
const SINGLE_REPO_STDOUT = `[INFO] Scanning for projects...
[INFO]
[INFO] --- dependency:3.9.0:list-repositories (default-cli) @ test-project ---
[INFO] Project remote repositories used by this build:
 * central (https://repo.maven.apache.org/maven2, default, releases)

[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
`;

const MULTI_REPO_STDOUT = `[INFO] Scanning for projects...
[INFO] --- dependency:3.9.0:list-repositories (default-cli) @ snapshot-parent ---
[WARNING] The POM for io.snyk.os-managed:snapshot-child:jar:1.0.1-SNAPSHOT is missing, no dependency information available
[INFO] Project remote repositories used by this build:
 * local-snapshots (https://nexus.fake.invalid/repository/local-snapshots/, default, releases+snapshots)
 * central (https://repo.maven.apache.org/maven2, default, releases)

[INFO] BUILD SUCCESS
`;

// Captured with a mirror active (settings.xml with a <mirror> of central). The
// repo entry carries a trailing `mirrored by <id> (<url>, ...)` clause. Under a
// mirror, an artifact's _remote.repositories records the MIRROR id, so the map
// must contain that id -> the mirror URL.
const MIRRORED_STDOUT = `[INFO] Scanning for projects...
[INFO] --- dependency:3.9.0:list-repositories (default-cli) @ google-project ---
[INFO] Project remote repositories used by this build:
 * central (https://repo.maven.apache.org/maven2, default, releases) mirrored by google-gcs-mirror (https://maven-central.storage-download.googleapis.com/maven2/, default, releases)

[INFO] BUILD SUCCESS
`;

describe('fetchRepositoryUrlMap output parsing', () => {
  afterEach(() => jest.clearAllMocks());

  it('parses a single repository entry', async () => {
    mockedExecute.mockResolvedValue(SINGLE_REPO_STDOUT);

    const map = await fetchRepositoryUrlMap(context, false);

    expect(map.get('central')).toEqual({
      url: 'https://repo.maven.apache.org/maven2',
      rank: 0,
    });
    expect(map.size).toBe(1);
  });

  it('parses multiple repositories into a single union map, ranked in output order', async () => {
    mockedExecute.mockResolvedValue(MULTI_REPO_STDOUT);

    const map = await fetchRepositoryUrlMap(context, false);

    // list-repositories prints repos in priority order; rank captures that so a
    // multi-id artifact can pick the highest-priority (lowest-rank) repo.
    expect(map.get('local-snapshots')).toEqual({
      // A trailing slash from settings.xml/mirror is preserved as-is; the join in
      // buildDistributionUrlLabel normalises it, not the parse.
      url: 'https://nexus.fake.invalid/repository/local-snapshots/',
      rank: 0,
    });
    expect(map.get('central')).toEqual({
      url: 'https://repo.maven.apache.org/maven2',
      rank: 1,
    });
    expect(map.size).toBe(2);
  });

  it('records both the logical id and the mirror id, each with its own url', async () => {
    mockedExecute.mockResolvedValue(MIRRORED_STDOUT);

    const map = await fetchRepositoryUrlMap(context, false);

    // The logical id is parsed first (rank 0), the mirror id second (rank 1);
    // an artifact recording both prefers the canonical central URL by rank.
    expect(map.get('central')).toEqual({
      url: 'https://repo.maven.apache.org/maven2',
      rank: 0,
    });
    // _remote.repositories records the mirror id under a mirror, so this entry
    // is what resolves labels for a mirrored artifact — pointing at the mirror URL.
    expect(map.get('google-gcs-mirror')).toEqual({
      url: 'https://maven-central.storage-download.googleapis.com/maven2/',
      rank: 1,
    });
    expect(map.size).toBe(2);
  });

  it('ignores [INFO]/[WARNING] and other non-repository lines', async () => {
    mockedExecute.mockResolvedValue(MULTI_REPO_STDOUT);

    const map = await fetchRepositoryUrlMap(context, false);

    // Only the two ` * <id> (...)` lines become entries; header/warning/build
    // lines must not leak in as bogus repo ids.
    expect([...map.keys()].sort()).toEqual(['central', 'local-snapshots']);
  });

  it('keeps the first occurrence (url and rank) when a repository id is repeated', async () => {
    mockedExecute.mockResolvedValue(
      `[INFO] Project remote repositories used by this build:
 * central (https://first.example/maven2, default, releases)
 * central (https://second.example/maven2, default, releases)
`,
    );

    const map = await fetchRepositoryUrlMap(context, false);

    expect(map.get('central')).toEqual({
      url: 'https://first.example/maven2',
      rank: 0,
    });
    expect(map.size).toBe(1);
  });

  it('strips embedded basic-auth credentials from repository urls at ingest', async () => {
    // A repository configured with credentials in the URL itself (rather than a
    // settings.xml <server> block), e.g. https://user:secret@example.com/maven2.
    // dependency:list-repositories prints it verbatim, so the userinfo must be
    // stripped here — the map, logs and downstream labels must never carry it.
    mockedExecute.mockResolvedValue(
      `[INFO] Project remote repositories used by this build:
 * central (https://user:secret@example.com/maven2, default, releases)
`,
    );

    const map = await fetchRepositoryUrlMap(context, false);

    const entry = map.get('central');
    expect(entry?.url).toBe('https://example.com/maven2');
    expect(entry?.url).not.toContain('user');
    expect(entry?.url).not.toContain('secret');
  });

  it('drops a repository whose url is not parseable (port out of range)', async () => {
    // A port above 65535 makes `new URL()` throw on construction, so the
    // credentials can't be stripped. Rather than store the raw URL (leaking the
    // userinfo), the repo is omitted from the map entirely.
    mockedExecute.mockResolvedValue(
      `[INFO] Project remote repositories used by this build:
 * central (https://user:secret@example.com:99999/maven2, default, releases)
`,
    );

    const map = await fetchRepositoryUrlMap(context, false);

    expect(map.has('central')).toBe(false);
    expect(map.size).toBe(0);
  });

  it('returns an empty map when no repository lines are present', async () => {
    mockedExecute.mockResolvedValue(
      `[INFO] Project remote repositories used by this build:
[INFO] BUILD SUCCESS
`,
    );

    const map = await fetchRepositoryUrlMap(context, false);

    expect(map.size).toBe(0);
  });

  it('returns an empty map (never throws) when the goal fails', async () => {
    mockedExecute.mockRejectedValue(new Error('mvn exited with code 1'));

    const map = await fetchRepositoryUrlMap(context, false);

    expect(map.size).toBe(0);
  });

  it('pins the maven-dependency-plugin version on the invoked goal', async () => {
    mockedExecute.mockResolvedValue(SINGLE_REPO_STDOUT);

    await fetchRepositoryUrlMap(context, false, '3.9.0');

    const invokedArgs = mockedExecute.mock.calls[0][1] as string[];
    // Pinned goal, not the bare `dependency:list-repositories`, so the output
    // format is deterministic (3.x single-line form) regardless of the plugin
    // version the project would otherwise resolve.
    expect(invokedArgs[0]).toBe(
      'org.apache.maven.plugins:maven-dependency-plugin:3.9.0:list-repositories',
    );
    expect(invokedArgs).toContain('--batch-mode');
  });

  it('forwards the user maven args so the effective config matches the build', async () => {
    mockedExecute.mockResolvedValue(SINGLE_REPO_STDOUT);

    await fetchRepositoryUrlMap(context, false, '3.9.0', [
      '-s',
      'corporate-settings.xml',
      '-Pinternal',
    ]);

    const invokedArgs = mockedExecute.mock.calls[0][1] as string[];
    // Without these, list-repositories runs under a different effective config
    // than the resolve/tree pipeline and the recorded repo ids won't line up.
    expect(invokedArgs).toEqual(
      expect.arrayContaining(['-s', 'corporate-settings.xml', '-Pinternal']),
    );
  });
});
