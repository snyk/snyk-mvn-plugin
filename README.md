![Snyk logo](https://snyk.io/style/asset/logo/snyk-print.svg)

[![Known Vulnerabilities](https://snyk.io/test/github/snyk/snyk-mvn-plugin/badge.svg?targetFile=package.json)](https://snyk.io/test/github/snyk/snyk-mvn-plugin?targetFile=package.json)

---

Snyk helps you find, fix and monitor for known vulnerabilities in your dependencies, both on an ad hoc basis and as part of your CI (Build) system.

| :information_source: This repository is only a plugin to be used with the Snyk CLI tool. To use this plugin to test and fix vulnerabilities in your project, install the Snyk CLI tool first. Head over to [snyk.io](https://github.com/snyk/snyk) to get started. |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |

## Snyk Maven CLI Plugin

This plugin provides dependency metadata for Maven projects that use mvn and have a pom.xml file. It is an internal component intended for use by our [CLI tool](https://github.com/snyk/snyk).

If you are looking to add tasks to your Maven build process you should use our [Maven Plugin](https://github.com/snyk/snyk-maven-plugin).

## Features

- **Dependency Tree Analysis**: Analyzes Maven dependency trees to build dependency graphs
- **Test Scope Support**: Optional inclusion of test-scoped dependencies
- **Verbose Mode**: Detailed dependency analysis with version resolution information
- **Archive Scanning**: Direct analysis of JAR/WAR files
- **Artifact Fingerprinting**: Generate cryptographic fingerprints for Maven artifacts

## API Usage

The plugin exports an `inspect` function that analyzes Maven projects:

```typescript
import { inspect } from 'snyk-mvn-plugin';

const result = await inspect(rootPath, targetFile, options);
```

### Parameters

- `rootPath` (string): The root directory of the Maven project
- `targetFile` (string, optional): Path to the pom.xml file or archive to analyze
- `options` (MavenOptions, optional): Configuration options

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dev` | boolean | `false` | Include development dependencies |
| `scanAllUnmanaged` | boolean | `false` | Scan all unmanaged archive files |
| `allProjects` | boolean | `false` | Include all projects in multi-module builds |
| `mavenAggregateProject` | boolean | `false` | Treat as Maven aggregate project |
| `mavenVerboseIncludeAllVersions` | boolean | `false` | Include all dependency versions in verbose mode |
| `fingerprintArtifacts` | boolean | `false` | Generate cryptographic fingerprints for artifacts |
| `fingerprintAlgorithm` | string | `'sha256'` | Hash algorithm ('sha1', 'sha256', 'sha512') |
| `fingerprintTiming` | boolean | `false` | Report fingerprinting performance metrics |
| `fingerprintConcurrency` | number | `10` | Number of concurrent fingerprinting operations |
| `mavenRepository` | string | - | Custom Maven repository path |

## Artifact Fingerprinting

The plugin can generate cryptographic fingerprints (hashes) for Maven artifacts to enhance security and integrity verification.

### Prerequisites

- Maven repository must be accessible (local or custom path)
- Artifacts must be downloaded and available in the repository
- Supported file types: JAR, WAR, AAR, and other Maven artifacts

### Configuration

Enable fingerprinting by setting `fingerprintArtifacts: true`:

```typescript
const result = await inspect(rootPath, 'pom.xml', {
  fingerprintArtifacts: true,
  fingerprintAlgorithm: 'sha256',
  fingerprintTiming: true,
  fingerprintConcurrency: 5,
  mavenRepository: '/path/to/custom/repo'
});
```

### Supported Hash Algorithms

- `sha1` - SHA-1 (160-bit)
- `sha256` - SHA-256 (256-bit) - **Default**
- `sha512` - SHA-512 (512-bit)

### Output Format

When fingerprinting is enabled, the dependency graph includes additional metadata:

```json
{
  "graph": {
    "nodes": [
      {
        "nodeId": "com.example:artifact:jar:1.0.0",
        "info": {
          "name": "com.example:artifact",
          "version": "1.0.0",
          "labels": {
            "fingerprint": "abc123...",
            "fingerprintAlgorithm": "sha256",
            "artifactPath": "/path/to/artifact-1.0.0.jar",
            "fileSize": "12345"
          }
        }
      }
    ]
  }
}
```

### Error Handling

If fingerprinting fails for an artifact, error information is included:

```json
{
  "labels": {
    "fingerprintError": "Artifact not found in repository"
  }
}
```

### Performance Considerations

- Fingerprinting adds processing time depending on artifact sizes
- Use `fingerprintConcurrency` to control parallel processing
- Enable `fingerprintTiming` to monitor performance
- Consider using `sha1` for faster processing of large artifacts

### Example Timing Output

```
=== Fingerprint Timing Summary ===
Total artifacts: 25
Successful: 23
Failed: 2
Total time: 1,234.56ms
Average time per artifact: 49.38ms
Fastest: 12.34ms
Slowest: 156.78ms
=====================================
```

# Support

❌ Not supported
❓ No issues expected but not regularly tested
✅ Supported and verified with tests

## Supported OS

| OS      | Supported |
| ------- | --------- |
| Windows | ✅        |
| Linux   | ✅        |
| OSX     | ️✅       |

## Supported Node versions

| Node | Supported |
|------| --------- |
| 20   | ✅        |

## Supported Maven versions

This plugin supports Maven versions 3.\*
