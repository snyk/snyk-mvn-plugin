import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { parseDigraphs } from '../../../lib/parse/digraph';
import { buildDepGraph } from '../../../lib/parse/dep-graph';
import {
  buildM2HashLabelsMap,
  readM2HashLabels,
} from '../../../lib/parse/m2-hash-labels';
import type { ParseContext } from '../../../lib/parse/types';

// Helper: write a fake artifact JAR plus the three companion files Maven
// would have written when it pulled the artifact from a registry. The JAR
// content is arbitrary (we never read it); the companion files contain real
// hashes of that content so they look like what JFrog/Central would serve.
function writeFakeArtifact(
  repoRoot: string,
  groupId: string,
  artifactId: string,
  version: string,
  payload: Buffer,
): void {
  const groupPath = groupId.replace(/\./g, path.sep);
  const dir = path.join(repoRoot, groupPath, artifactId, version);
  fs.mkdirSync(dir, { recursive: true });

  const jarPath = path.join(dir, `${artifactId}-${version}.jar`);
  fs.writeFileSync(jarPath, payload);

  for (const algo of ['md5', 'sha1', 'sha256']) {
    const digest = crypto.createHash(algo).update(payload).digest('hex');
    // Maven's published companion files often have the form `<digest>  <filename>`
    // (two spaces). Mirror that to make sure our parser handles it.
    fs.writeFileSync(`${jarPath}.${algo}`, `${digest}  ${artifactId}-${version}.jar\n`);
  }
}

describe('Maven hash:<alg> label emission from .m2 companion files', () => {
  let repoRoot: string;
  let acceptedHashes: Record<string, Record<string, string>>;

  beforeAll(() => {
    repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'snyk-mvn-poc-'));

    // Two artifacts standing in for a small Maven dependency tree.
    const guavaPayload = Buffer.from('fake guava jar contents');
    const failureaccessPayload = Buffer.from('fake failureaccess jar contents');

    writeFakeArtifact(
      repoRoot,
      'com.google.guava',
      'guava',
      '32.1.3-jre',
      guavaPayload,
    );
    writeFakeArtifact(
      repoRoot,
      'com.google.guava',
      'failureaccess',
      '1.0.1',
      failureaccessPayload,
    );

    // Pre-compute the expected hex values so each test can assert exactly.
    const hashOf = (payload: Buffer, algo: string): string =>
      crypto.createHash(algo).update(payload).digest('hex');

    acceptedHashes = {
      'com.google.guava:guava:jar:32.1.3-jre': {
        'hash:md5': hashOf(guavaPayload, 'md5'),
        'hash:sha-1': hashOf(guavaPayload, 'sha1'),
        'hash:sha-256': hashOf(guavaPayload, 'sha256'),
      },
      'com.google.guava:failureaccess:jar:1.0.1': {
        'hash:md5': hashOf(failureaccessPayload, 'md5'),
        'hash:sha-1': hashOf(failureaccessPayload, 'sha1'),
        'hash:sha-256': hashOf(failureaccessPayload, 'sha256'),
      },
    };
  });

  afterAll(() => {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  describe('readM2HashLabels', () => {
    it('reads md5/sha-1/sha-256 from companion files', () => {
      const labels = readM2HashLabels(
        'com.google.guava:guava:jar:32.1.3-jre',
        repoRoot,
      );
      expect(labels).toEqual(
        acceptedHashes['com.google.guava:guava:jar:32.1.3-jre'],
      );
    });

    it('returns an empty object when the artifact is not in the repository', () => {
      const labels = readM2HashLabels(
        'org.unknown:nothing-here:jar:0.0.0',
        repoRoot,
      );
      expect(labels).toEqual({});
    });

    it('omits algorithms whose companion file is missing', () => {
      // Drop the .sha256 to simulate an older artifact without SHA-256
      // published. The other two should still come back.
      const jarPath = path.join(
        repoRoot,
        'com/google/guava/guava/32.1.3-jre/guava-32.1.3-jre.jar',
      );
      const sha256Path = `${jarPath}.sha256`;
      const sha256Backup = fs.readFileSync(sha256Path);
      fs.unlinkSync(sha256Path);
      try {
        const labels = readM2HashLabels(
          'com.google.guava:guava:jar:32.1.3-jre',
          repoRoot,
        );
        expect(Object.keys(labels).sort()).toEqual(['hash:md5', 'hash:sha-1']);
      } finally {
        fs.writeFileSync(sha256Path, sha256Backup);
      }
    });
  });

  describe('buildDepGraph integration', () => {
    it('emits hash labels on every node with a known artifact', async () => {
      const diGraph = `"com.google.guava:guava:jar:32.1.3-jre" {
        "com.google.guava:guava:jar:32.1.3-jre" -> "com.google.guava:failureaccess:jar:1.0.1" ;
      }`;
      const mavenGraph = parseDigraphs([diGraph])[0];

      const hashLabelsMap = buildM2HashLabelsMap([mavenGraph], repoRoot);
      const context: ParseContext = {
        includeTestScope: false,
        verboseEnabled: false,
        fingerprintMap: new Map(),
        includePurl: false,
        hashLabelsMap,
      };

      const depGraph = buildDepGraph(mavenGraph, context);
      const graphJson = depGraph.toJSON();

      // In this hand-rolled fixture, guava is the root of the dep tree (which
      // a real Maven project wouldn't have — but we set it up this way to keep
      // the test compact, and we did seed the .m2 fixture with guava's hashes,
      // so the root node should carry them).
      const rootNode = graphJson.graph.nodes.find(
        (n) => n.nodeId === 'root-node',
      );
      expect(rootNode?.info?.labels).toEqual(
        acceptedHashes['com.google.guava:guava:jar:32.1.3-jre'],
      );

      // The transitive node — failureaccess — should also carry its hashes.
      const failureaccess = graphJson.graph.nodes.find(
        (n) => n.pkgId === 'com.google.guava:failureaccess@1.0.1',
      );
      expect(failureaccess).toBeDefined();
      expect(failureaccess?.info?.labels).toEqual(
        acceptedHashes['com.google.guava:failureaccess:jar:1.0.1'],
      );
    });

    it('emits no hash labels when artifacts are not in the repository', async () => {
      const diGraph = `"org.unknown:nothing-here:jar:0.0.0" {
        "org.unknown:nothing-here:jar:0.0.0" -> "org.also-unknown:still-nothing:jar:0.0.0" ;
      }`;
      const mavenGraph = parseDigraphs([diGraph])[0];

      const hashLabelsMap = buildM2HashLabelsMap([mavenGraph], repoRoot);
      const context: ParseContext = {
        includeTestScope: false,
        verboseEnabled: false,
        fingerprintMap: new Map(),
        includePurl: false,
        hashLabelsMap,
      };

      const depGraph = buildDepGraph(mavenGraph, context);
      const graphJson = depGraph.toJSON();

      for (const node of graphJson.graph.nodes) {
        const labels = node.info?.labels ?? {};
        for (const key of Object.keys(labels)) {
          expect(key.startsWith('hash:')).toBe(false);
        }
      }
    });
  });

  describe('PoC demo: depgraph with hashes', () => {
    it('logs the full depgraph JSON for visual inspection', async () => {
      const diGraph = `"com.google.guava:guava:jar:32.1.3-jre" {
        "com.google.guava:guava:jar:32.1.3-jre" -> "com.google.guava:failureaccess:jar:1.0.1" ;
      }`;
      const mavenGraph = parseDigraphs([diGraph])[0];

      const hashLabelsMap = buildM2HashLabelsMap([mavenGraph], repoRoot);
      const context: ParseContext = {
        includeTestScope: false,
        verboseEnabled: false,
        fingerprintMap: new Map(),
        includePurl: false,
        hashLabelsMap,
      };

      const depGraph = buildDepGraph(mavenGraph, context);
      // eslint-disable-next-line no-console
      console.log(
        '\n===== Maven depgraph with hash labels =====\n' +
          JSON.stringify(depGraph.toJSON(), null, 2),
      );
    });
  });
});
