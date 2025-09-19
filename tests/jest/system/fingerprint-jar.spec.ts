import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { legacyPlugin } from '@snyk/cli-interface';
import * as plugin from '../../../lib';
import { mockSnykSearchClient } from '../../helpers/mock-search';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');

describe('Fingerprinting Jar Tests', () => {
  describe('scanAllUnmanaged + fingerprinting integration', () => {
    test('should fingerprint artifacts when scanAllUnmanaged is enabled', async () => {
      const root = path.join(fixturesPath, 'jars');

      const result = await plugin.inspect(
        root,
        undefined,
        {
          scanAllUnmanaged: true,
          fingerprintArtifacts: true,
          fingerprintAlgorithm: 'sha256',
        },
        mockSnykSearchClient,
      );

      expect(legacyPlugin.isMultiResult(result)).toBeFalsy();

      const singleResult = result as legacyPlugin.SinglePackageResult;
      const depGraph = singleResult.dependencyGraph!;
      const depGraphJson = depGraph.toJSON();

      // Get dependency packages (excludes root automatically) - exclude fixture root packages
      const depPkgs = depGraph
        .getDepPkgs()
        .filter((pkg) => !pkg.name.startsWith('fixtures:'));

      expect(depPkgs.length).toBeGreaterThan(0);

      // Check that dependencies have PURLs with checksums
      for (const pkg of depPkgs) {
        expect(pkg.purl).toBeDefined();
        expect(pkg.purl).toContain('checksum=sha256%3A');
      }
    });

    test('should not include PURLs when fingerprinting is disabled for scanAllUnmanaged', async () => {
      const root = path.join(fixturesPath, 'jars');

      const result = await plugin.inspect(
        root,
        undefined,
        {
          scanAllUnmanaged: true,
          fingerprintArtifacts: false,
        },
        mockSnykSearchClient,
      );

      expect(legacyPlugin.isMultiResult(result)).toBeFalsy();

      const singleResult = result as legacyPlugin.SinglePackageResult;
      const depGraph = singleResult.dependencyGraph!;
      const depGraphJson = depGraph.toJSON();

      // Get dependency packages (excludes root automatically) - exclude fixture root packages
      const depPkgs = depGraph
        .getDepPkgs()
        .filter((pkg) => !pkg.name.startsWith('fixtures:'));

      expect(depPkgs.length).toBeGreaterThan(0);

      // Check that dependencies do NOT have PURLs
      for (const pkg of depPkgs) {
        expect(pkg.purl).toBeUndefined();
      }
    });

    test('should handle mixed jar types with fingerprinting', async () => {
      const root = path.join(fixturesPath, 'good-and-bad');

      const result = await plugin.inspect(
        root,
        undefined,
        {
          scanAllUnmanaged: true,
          fingerprintArtifacts: true,
        },
        mockSnykSearchClient,
      );

      expect(legacyPlugin.isMultiResult(result)).toBeFalsy();

      const singleResult = result as legacyPlugin.SinglePackageResult;
      const depGraph = singleResult.dependencyGraph!;
      const pkgs = depGraph.getDepPkgs();

      expect(pkgs.length).toEqual(2);

      for (const pkg of pkgs) {
        expect(pkg.purl).toBeDefined();
      }
    });
  });

  describe('Hash algorithm validation', () => {
    test.each(['sha1', 'sha256', 'sha512'] as const)(
      'should work with %s hash algorithm',
      async (algorithm) => {
        const root = path.join(fixturesPath, 'spring-core');
        const jarPath = path.join(root, 'spring-core-5.1.8.RELEASE.jar');

        const result = await plugin.inspect(
          root,
          'spring-core-5.1.8.RELEASE.jar',
          {
            fingerprintArtifacts: true,
            fingerprintAlgorithm: algorithm,
          },
          mockSnykSearchClient,
        );

        expect(legacyPlugin.isMultiResult(result)).toBeFalsy();

        const singleResult = result as legacyPlugin.SinglePackageResult;
        const depGraph = singleResult.dependencyGraph!;

        const depPkgs = depGraph.getDepPkgs();

        if (depPkgs.length > 0) {
          const pkg = depPkgs[0];
          expect(pkg.purl).toBeDefined();
          expect(pkg.purl).toContain(`checksum=${algorithm}%3A`);
        }
      },
    );
  });

  describe('PURL format validation', () => {
    test('should generate correctly formatted PURLs with checksums', async () => {
      const root = path.join(fixturesPath, 'spring-core');

      const result = await plugin.inspect(
        root,
        'spring-core-5.1.8.RELEASE.jar',
        {
          fingerprintArtifacts: true,
          fingerprintAlgorithm: 'sha256',
        },
        mockSnykSearchClient,
      );

      expect(legacyPlugin.isMultiResult(result)).toBeFalsy();

      const singleResult = result as legacyPlugin.SinglePackageResult;
      const depGraph = singleResult.dependencyGraph!;

      const depPkgs = depGraph.getDepPkgs();

      if (depPkgs.length > 0) {
        const pkg = depPkgs[0];
        const purl = pkg.purl;

        expect(purl).toBeDefined();
        expect(purl).toMatch(/^pkg:maven\//); // Starts with pkg:maven/
        expect(purl).toContain('@'); // Has version separator

        if (purl!.includes('checksum=')) {
          // If checksum is present, validate format
          expect(purl).toMatch(/checksum=sha256%3A[a-fA-F0-9]{64}/);
        }
      }
    });
  });
});
