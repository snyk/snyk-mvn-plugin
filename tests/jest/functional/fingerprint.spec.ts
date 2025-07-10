import * as path from 'path';
import { 
  dependencyIdToArtifactPath, 
  createFingerprintLabels, 
  reportFingerprintTiming 
} from '../../../lib/fingerprint';
import { FingerprintData } from '../../../lib/parse/types';

describe('Fingerprint Module Unit Tests', () => {
  
  describe('dependencyIdToArtifactPath', () => {
    const testRepoPath = '/home/user/.m2/repository';

    it('should convert simple GAV to correct path', () => {
      const dependencyId = 'com.google.guava:guava:jar:32.1.3-jre';
      const expected = path.join(
        testRepoPath,
        'com/google/guava/guava/32.1.3-jre/guava-32.1.3-jre.jar'
      );
      
      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle dependency with scope', () => {
      const dependencyId = 'junit:junit:jar:4.13.2:test';
      const expected = path.join(
        testRepoPath,
        'junit/junit/4.13.2/junit-4.13.2.jar'
      );
      
      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle dependency with classifier (6 parts)', () => {
      const dependencyId = 'org.example:my-lib:jar:sources:1.0.0:compile';
      const expected = path.join(
        testRepoPath,
        'org/example/my-lib/1.0.0/my-lib-1.0.0-sources.jar'
      );
      
      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle dependency with just classifier (no scope)', () => {
      const dependencyId = 'org.example:my-lib:jar:sources:1.0.0';
      const expected = path.join(
        testRepoPath,
        'org/example/my-lib/sources/my-lib-sources.jar'
      );
      
      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle complex group IDs with dots', () => {
      const dependencyId = 'org.springframework.boot:spring-boot-starter:jar:2.7.0';
      const expected = path.join(
        testRepoPath,
        'org/springframework/boot/spring-boot-starter/2.7.0/spring-boot-starter-2.7.0.jar'
      );
      
      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });

    it('should handle different artifact types', () => {
      const dependencyId = 'com.example:my-war:war:1.0.0';
      const expected = path.join(
        testRepoPath,
        'com/example/my-war/1.0.0/my-war-1.0.0.war'
      );
      
      const result = dependencyIdToArtifactPath(dependencyId, testRepoPath);
      expect(result).toBe(expected);
    });
  });

  describe('createFingerprintLabels', () => {
    it('should create labels for successful fingerprint', () => {
      const fingerprintData: FingerprintData = {
        hash: 'abc123def456',
        algorithm: 'sha256',
        filePath: '/path/to/artifact.jar',
        fileSize: 1024,
        processingTime: 5.5
      };

      const result = createFingerprintLabels(fingerprintData);
      
      expect(result).toEqual({
        fingerprint: 'abc123def456',
        fingerprintAlgorithm: 'sha256',
        artifactPath: '/path/to/artifact.jar',
        fileSize: '1024'
      });
    });

    it('should create error labels for failed fingerprint', () => {
      const fingerprintData: FingerprintData = {
        hash: '',
        algorithm: 'sha256',
        filePath: '/path/to/missing.jar',
        fileSize: 0,
        processingTime: 1.2,
        error: 'Artifact not found in repository'
      };

      const result = createFingerprintLabels(fingerprintData);
      
      expect(result).toEqual({
        fingerprintError: 'Artifact not found in repository'
      });
    });

    it('should handle different hash algorithms', () => {
      const fingerprintData: FingerprintData = {
        hash: 'sha1hash',
        algorithm: 'sha1',
        filePath: '/path/to/artifact.jar',
        fileSize: 2048,
        processingTime: 3.1
      };

      const result = createFingerprintLabels(fingerprintData);
      
      expect(result.fingerprintAlgorithm).toBe('sha1');
      expect(result.fingerprint).toBe('sha1hash');
    });
  });

  describe('reportFingerprintTiming', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should report timing summary for successful fingerprints', () => {
      const fingerprintMap = new Map<string, FingerprintData>([
        ['dep1', {
          hash: 'hash1',
          algorithm: 'sha256',
          filePath: '/path/1.jar',
          fileSize: 1000,
          processingTime: 10.5
        }],
        ['dep2', {
          hash: 'hash2',
          algorithm: 'sha256',
          filePath: '/path/2.jar',
          fileSize: 2000,
          processingTime: 20.2
        }]
      ]);

      reportFingerprintTiming(fingerprintMap);

      expect(consoleSpy).toHaveBeenCalledWith('\n=== Fingerprint Timing Summary ===');
      expect(consoleSpy).toHaveBeenCalledWith('Total artifacts: 2');
      expect(consoleSpy).toHaveBeenCalledWith('Successful: 2');
      expect(consoleSpy).toHaveBeenCalledWith('Failed: 0');
      expect(consoleSpy).toHaveBeenCalledWith('Total time: 30.70ms');
      expect(consoleSpy).toHaveBeenCalledWith('Average time per artifact: 15.35ms');
      expect(consoleSpy).toHaveBeenCalledWith('Fastest: 10.50ms');
      expect(consoleSpy).toHaveBeenCalledWith('Slowest: 20.20ms');
    });

    it('should report timing summary with failures', () => {
      const fingerprintMap = new Map<string, FingerprintData>([
        ['dep1', {
          hash: 'hash1',
          algorithm: 'sha256',
          filePath: '/path/1.jar',
          fileSize: 1000,
          processingTime: 5.0
        }],
        ['dep2', {
          hash: '',
          algorithm: 'sha256',
          filePath: '/path/missing.jar',
          fileSize: 0,
          processingTime: 2.0,
          error: 'File not found'
        }]
      ]);

      reportFingerprintTiming(fingerprintMap);

      expect(consoleSpy).toHaveBeenCalledWith('Total artifacts: 2');
      expect(consoleSpy).toHaveBeenCalledWith('Successful: 1');
      expect(consoleSpy).toHaveBeenCalledWith('Failed: 1');
    });

    it('should handle empty fingerprint map', () => {
      const fingerprintMap = new Map<string, FingerprintData>();

      reportFingerprintTiming(fingerprintMap);

      expect(consoleSpy).toHaveBeenCalledWith('Total artifacts: 0');
      expect(consoleSpy).toHaveBeenCalledWith('Successful: 0');
      expect(consoleSpy).toHaveBeenCalledWith('Failed: 0');
    });
  });
}); 