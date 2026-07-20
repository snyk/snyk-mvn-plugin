import { inspect } from '../../../lib/index';
import { legacyPlugin } from '@snyk/cli-interface';
import { execFileSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');

// On Windows the executable is `mvn.cmd`, which Node only resolves when spawned
// through a shell — mirror lib/sub-process.ts, which sets `shell: true` there.
const isWindows = /^win/.test(os.platform());

// Component metadata (hash + distribution:url labels) is read from files in the
// local Maven repository — the JAR's companion checksums and the
// `_remote.repositories` file Maven writes alongside a downloaded artifact. A
// bare `dependency:tree` resolution does not necessarily download the JAR bytes
// (and therefore those companion files), so resolve the fixture's artifacts into
// `~/.m2` up front — CI starts with an empty repository.
beforeAll(() => {
  execFileSync('mvn', ['clean', 'install', '-DskipTests'], {
    cwd: testProjectPath,
    stdio: 'ignore',
    shell: isWindows,
  });
}, 300000);

function hashLabelKeys(labels?: {
  [key: string]: string | undefined;
}): string[] {
  return Object.keys(labels ?? {}).filter((key) => key.startsWith('hash:'));
}

test('component metadata disabled vs enabled comparison', async () => {
  // Disabled (default).
  const resultDisabled = await inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      dev: false,
      includeComponentMetadata: false,
    },
  );

  if (!legacyPlugin.isMultiResult(resultDisabled)) {
    throw new Error('expected multi inspect result for disabled case');
  }

  // Enabled.
  const resultEnabled = await inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      dev: false,
      includeComponentMetadata: true,
    },
  );

  if (!legacyPlugin.isMultiResult(resultEnabled)) {
    throw new Error('expected multi inspect result for enabled case');
  }

  const disabledGraph = resultDisabled.scannedProjects[0].depGraph!.toJSON();
  const enabledGraph = resultEnabled.scannedProjects[0].depGraph!.toJSON();

  // The flag only adds labels; the graph shape is unchanged.
  expect(enabledGraph.graph.nodes.length).toBe(
    disabledGraph.graph.nodes.length,
  );

  // Disabled: no node carries a hash:* or distribution:url label.
  for (const node of disabledGraph.graph.nodes) {
    expect(hashLabelKeys(node.info?.labels)).toHaveLength(0);
    expect(node.info?.labels?.['distribution:url']).toBeUndefined();
  }

  // Enabled: the axis dependency was resolved into the local Maven repository,
  // so it carries the `.jar.sha1` companion hash. Even though Maven Central
  // publishes several checksum files per artifact, Maven only downloads a
  // single one to verify the JAR, so .sha1 is the one companion reliably
  // present locally; assert the others' format only when they happen to exist.
  const axisNode = enabledGraph.graph.nodes.find(
    (node) => node.pkgId === 'axis:axis@1.4',
  );
  expect(axisNode).toBeDefined();

  const axisLabels = axisNode?.info?.labels ?? {};
  expect(axisLabels['hash:sha-1']).toMatch(/^[0-9a-f]{40}$/);
  if (axisLabels['hash:md5']) {
    expect(axisLabels['hash:md5']).toMatch(/^[0-9a-f]{32}$/);
  }
  if (axisLabels['hash:sha-256']) {
    expect(axisLabels['hash:sha-256']).toMatch(/^[0-9a-f]{64}$/);
  }
  if (axisLabels['hash:sha-512']) {
    expect(axisLabels['hash:sha-512']).toMatch(/^[0-9a-f]{128}$/);
  }

  // Enabled: the axis dependency was downloaded from Maven Central, so its
  // `_remote.repositories` file records `central` and `dependency:list-repositories`
  // reports central's URL — together they resolve the full artifact URL.
  expect(axisLabels['distribution:url']).toBe(
    'https://repo.maven.apache.org/maven2/axis/axis/1.4/axis-1.4.jar',
  );

  // At least one resolved dependency carries each label kind end-to-end.
  const nodesWithHashes = enabledGraph.graph.nodes.filter(
    (node) => hashLabelKeys(node.info?.labels).length > 0,
  );
  expect(nodesWithHashes.length).toBeGreaterThan(0);

  const nodesWithDistributionUrl = enabledGraph.graph.nodes.filter(
    (node) => node.info?.labels?.['distribution:url'],
  );
  expect(nodesWithDistributionUrl.length).toBeGreaterThan(0);
});

test('component metadata graceful failure with nonexistent repository', async () => {
  // Point the readers at a repository that does not exist. Maven still resolves
  // the tree, but no companion or _remote.repositories files can be read, so
  // inspect succeeds with no hash or distribution:url labels rather than throwing.
  const result = await inspect('.', path.join(testProjectPath, 'pom.xml'), {
    dev: false,
    includeComponentMetadata: true,
    mavenRepository: '/completely/nonexistent/path',
  });

  if (!legacyPlugin.isMultiResult(result)) {
    throw new Error('expected multi inspect result');
  }

  for (const node of result.scannedProjects[0].depGraph!.toJSON().graph.nodes) {
    expect(hashLabelKeys(node.info?.labels)).toHaveLength(0);
    expect(node.info?.labels?.['distribution:url']).toBeUndefined();
  }
});
