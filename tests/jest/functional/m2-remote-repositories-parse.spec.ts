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

describe('fetchRepositoryUrlMap output parsing', () => {
  afterEach(() => jest.clearAllMocks());

  it('parses a single repository entry', async () => {
    mockedExecute.mockResolvedValue(SINGLE_REPO_STDOUT);

    const map = await fetchRepositoryUrlMap(context, false);

    expect(map.get('central')).toBe('https://repo.maven.apache.org/maven2');
    expect(map.size).toBe(1);
  });

  it('parses multiple repositories into a single union map', async () => {
    mockedExecute.mockResolvedValue(MULTI_REPO_STDOUT);

    const map = await fetchRepositoryUrlMap(context, false);

    expect(map.get('central')).toBe('https://repo.maven.apache.org/maven2');
    // A trailing slash from settings.xml/mirror is preserved as-is; the join in
    // readRemoteRepositoryLabel is responsible for normalising it, not the parse.
    expect(map.get('local-snapshots')).toBe(
      'https://nexus.fake.invalid/repository/local-snapshots/',
    );
    expect(map.size).toBe(2);
  });

  it('ignores [INFO]/[WARNING] and other non-repository lines', async () => {
    mockedExecute.mockResolvedValue(MULTI_REPO_STDOUT);

    const map = await fetchRepositoryUrlMap(context, false);

    // Only the two ` * <id> (...)` lines become entries; header/warning/build
    // lines must not leak in as bogus repo ids.
    expect([...map.keys()].sort()).toEqual(['central', 'local-snapshots']);
  });

  it('keeps the first occurrence when a repository id is repeated', async () => {
    mockedExecute.mockResolvedValue(
      `[INFO] Project remote repositories used by this build:
 * central (https://first.example/maven2, default, releases)
 * central (https://second.example/maven2, default, releases)
`,
    );

    const map = await fetchRepositoryUrlMap(context, false);

    expect(map.get('central')).toBe('https://first.example/maven2');
    expect(map.size).toBe(1);
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
});
