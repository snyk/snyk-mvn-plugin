import * as path from 'path';
import {
  dependencyIdToArtifactPath,
  createMavenPurlWithChecksum,
} from '../../../lib/fingerprint';
import { FingerprintData } from '../../../lib/parse/types';

describe('Fingerprint Module Unit Tests', () => {
  describe('dependencyIdToArtifactPath', () => {
    const testRepoPath = '/home/user/.m2/repository';

    it('should convert simple GAV to correct path', () => {
      const dependencyId = 'com.google.guava:guava:jar:32.1.3-jre';
      const expected = path.join(
        testRepoPath,
        'com/google/guava/guava/32.1.3-jre/guava-32.1.3-jre.jar',
      );

      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle dependency with scope', () => {
      const dependencyId = 'junit:junit:jar:4.13.2:test';
      const expected = path.join(
        testRepoPath,
        'junit/junit/4.13.2/junit-4.13.2.jar',
      );

      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle dependency with classifier (6 parts)', () => {
      const dependencyId = 'org.example:my-lib:jar:sources:1.0.0:compile';
      const expected = path.join(
        testRepoPath,
        'org/example/my-lib/1.0.0/my-lib-1.0.0-sources.jar',
      );

      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle dependency with just classifier (no scope)', () => {
      const dependencyId = 'org.example:my-lib:jar:sources:1.0.0';
      const expected = path.join(
        testRepoPath,
        'org/example/my-lib/sources/my-lib-sources.jar',
      );

      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle complex group IDs with dots', () => {
      const dependencyId =
        'org.springframework.boot:spring-boot-starter:jar:2.7.0';
      const expected = path.join(
        testRepoPath,
        'org/springframework/boot/spring-boot-starter/2.7.0/spring-boot-starter-2.7.0.jar',
      );

      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle different artifact types', () => {
      const dependencyId = 'com.example:my-war:war:1.0.0';
      const expected = path.join(
        testRepoPath,
        'com/example/my-war/1.0.0/my-war-1.0.0.war',
      );

      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });
  });

  describe('createMavenPurlWithChecksum', () => {
    it('should create PURL with checksum for successful fingerprint', () => {
      const fingerprintData: FingerprintData = {
        hash: 'abc123def456',
        algorithm: 'SHA256',
        filePath: '/path/to/artifact.jar',
        fileSize: 1024,
        processingTime: 5.5,
      };

      const result = createMavenPurlWithChecksum(
        'com.example',
        'my-library',
        '1.0.0',
        fingerprintData,
      );

      expect(result).toBe(
        'pkg:maven/com.example/my-library@1.0.0?checksum=sha256%3Aabc123def456',
      );
    });

    it('should create PURL without checksum for failed fingerprint', () => {
      const fingerprintData: FingerprintData = {
        hash: '',
        algorithm: 'sha256',
        filePath: '/path/to/missing.jar',
        fileSize: 0,
        processingTime: 1.2,
        error: 'Artifact not found in repository',
      };

      const result = createMavenPurlWithChecksum(
        'com.example',
        'my-library',
        '1.0.0',
        fingerprintData,
      );

      expect(result).toBe('pkg:maven/com.example/my-library@1.0.0');
    });

    it('should handle different hash algorithms', () => {
      const fingerprintData: FingerprintData = {
        hash: 'abcdef123456',
        algorithm: 'SHA1',
        filePath: '/path/to/artifact.jar',
        fileSize: 2048,
        processingTime: 3.1,
      };

      const result = createMavenPurlWithChecksum(
        'org.example',
        'test-lib',
        '2.0.0',
        fingerprintData,
      );

      expect(result).toBe(
        'pkg:maven/org.example/test-lib@2.0.0?checksum=sha1%3Aabcdef123456',
      );
    });

    it('should include classifier and type in PURL', () => {
      const fingerprintData: FingerprintData = {
        hash: 'def456ghi789',
        algorithm: 'sha256',
        filePath: '/path/to/artifact-sources.jar',
        fileSize: 512,
        processingTime: 2.1,
      };

      const result = createMavenPurlWithChecksum(
        'com.test',
        'my-artifact',
        '3.0.0',
        fingerprintData,
        'sources',
        'jar',
      );

      expect(result).toBe(
        'pkg:maven/com.test/my-artifact@3.0.0?checksum=sha256%3Adef456ghi789&classifier=sources',
      );
    });

    it('should handle no fingerprint data', () => {
      const result = createMavenPurlWithChecksum(
        'com.example',
        'basic-lib',
        '1.0.0',
      );

      expect(result).toBe('pkg:maven/com.example/basic-lib@1.0.0');
    });
  });
});
