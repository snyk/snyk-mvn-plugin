import { inspect } from '../../../lib/index';
import { legacyPlugin } from '@snyk/cli-interface';
import { execFileSync } from 'child_process';
import * as path from 'path';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');

// Hash labels are read from the JAR's companion checksum files in the local
// Maven repository. A bare `dependency:tree` resolution does not necessarily
// download the JAR bytes (and therefore the `.jar.sha1`/`.md5` companions), so
// resolve the fixture's artifacts into `~/.m2` up front — CI starts with an
// empty repository.
beforeAll(() => {
  execFileSync('mvn', ['clean', 'install', '-DskipTests'], {
    cwd: testProjectPath,
    stdio: 'ignore',
  });
}, 300000);

function hashLabelKeys(labels?: {
  [key: string]: string | undefined;
}): string[] {
  return Object.keys(labels ?? {}).filter((key) => key.startsWith('hash:'));
}

test('hash labels disabled vs enabled comparison', async () => {
  // Hashes disabled (default).
  const resultDisabled = await inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      dev: false,
      includeHashes: false,
    },
  );

  if (!legacyPlugin.isMultiResult(resultDisabled)) {
    throw new Error('expected multi inspect result for disabled case');
  }

  // Hashes enabled.
  const resultEnabled = await inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      dev: false,
      includeHashes: true,
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

  // Disabled: no node carries a hash:* label.
  for (const node of disabledGraph.graph.nodes) {
    expect(hashLabelKeys(node.info?.labels)).toHaveLength(0);
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

  // At least one resolved dependency carries hash labels end-to-end.
  const nodesWithHashes = enabledGraph.graph.nodes.filter(
    (node) => hashLabelKeys(node.info?.labels).length > 0,
  );
  expect(nodesWithHashes.length).toBeGreaterThan(0);
});

test('hash labels graceful failure with nonexistent repository', async () => {
  // Point the hash reader at a repository that does not exist. Maven still
  // resolves the tree, but no companion files can be read, so inspect succeeds
  // with no hash labels rather than throwing.
  const result = await inspect('.', path.join(testProjectPath, 'pom.xml'), {
    dev: false,
    includeHashes: true,
    mavenRepository: '/completely/nonexistent/path',
  });

  if (!legacyPlugin.isMultiResult(result)) {
    throw new Error('expected multi inspect result');
  }

  for (const node of result.scannedProjects[0].depGraph!.toJSON().graph.nodes) {
    expect(hashLabelKeys(node.info?.labels)).toHaveLength(0);
  }
});
