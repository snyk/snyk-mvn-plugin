import { inspect } from '../../../lib/index';
import { legacyPlugin } from '@snyk/cli-interface';
import * as path from 'path';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');

test('fingerprinting disabled vs enabled comparison', async () => {
  // Test 1: Fingerprinting disabled
  const resultDisabled = await inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      dev: false,
      fingerprintArtifacts: false,
    },
  );

  expect(resultDisabled).toBeDefined();

  if (!legacyPlugin.isMultiResult(resultDisabled)) {
    throw new Error('expected multi inspect result for disabled case');
  }

  const depGraphDisabled = resultDisabled.scannedProjects[0].depGraph!;
  const depPkgsDisabled = depGraphDisabled.getDepPkgs();

  // Test 2: Fingerprinting enabled
  const resultEnabled = await inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      dev: false,
      fingerprintArtifacts: true,
    },
  );

  expect(resultEnabled).toBeDefined();

  if (!legacyPlugin.isMultiResult(resultEnabled)) {
    throw new Error('expected multi inspect result for enabled case');
  }

  const depGraphEnabled = resultEnabled.scannedProjects[0].depGraph!;
  const depPkgsEnabled = depGraphEnabled.getDepPkgs();

  // Comparison tests
  expect(depPkgsDisabled.length).toBe(depPkgsEnabled.length);

  // Check PURL presence
  for (const pkgDisabled of depPkgsDisabled) {
    expect(pkgDisabled.purl).toBeUndefined();
  }

  for (const pkgEnabled of depPkgsEnabled) {
    expect(pkgEnabled.purl).toBeDefined();
    expect(pkgEnabled.purl!.startsWith('pkg:maven/')).toBe(true);
  }
});

describe.each(['sha1', 'sha256', 'sha512'] as const)(
  'hash algorithm selection',
  (algorithm) => {
    test(`should work with ${algorithm}`, async () => {
      const result = await inspect('.', path.join(testProjectPath, 'pom.xml'), {
        dev: false,
        fingerprintArtifacts: true,
        fingerprintAlgorithm: algorithm,
      });

      expect(result).toBeDefined();

      if (!legacyPlugin.isMultiResult(result)) {
        throw new Error(`expected multi result for ${algorithm}`);
      }

      const depGraph = result.scannedProjects[0].depGraph!;
      const depPkgs = depGraph.getDepPkgs();

      // Check if any package has PURL with the specified algorithm
      const pkgWithPurl = depPkgs.find((pkg) =>
        pkg.purl?.includes('checksum='),
      );
      if (pkgWithPurl) {
        expect(pkgWithPurl.purl!.includes(`checksum=${algorithm}%3A`)).toBe(
          true,
        );
      }
    });
  },
);

test('fingerprinting graceful failure handling', async () => {
  // Force fingerprinting to fail by using non-existent repository
  const result = await inspect('.', path.join(testProjectPath, 'pom.xml'), {
    dev: false,
    fingerprintArtifacts: true,
    mavenRepository: '/completely/nonexistent/path',
  });

  expect(result).toBeDefined();

  if (!legacyPlugin.isMultiResult(result)) {
    throw new Error('expected multi inspect result');
  }

  const depGraph = result.scannedProjects[0].depGraph!;
  const depPkgs = depGraph.getDepPkgs();

  // Should still have PURLs, just without checksums
  for (const pkg of depPkgs) {
    expect(pkg.purl).toBeDefined();
    expect(pkg.purl!.startsWith('pkg:maven/')).toBe(true);
  }
});
