import { legacyPlugin } from '@snyk/cli-interface';
import * as fs from 'fs';
import * as path from 'path';
import { DependencyTreeError } from './maven/errors';
import { createMavenContext } from './maven/context';
import { executeMavenPipeline } from './maven/executor';
import {
  createDepGraphFromArchive,
  createDepGraphFromArchives,
  findArchives,
  isArchive,
} from './archive';
import { formatGenericPluginError } from './error-format';
import * as debugModule from 'debug';
import { parseMavenDependencyTree } from './parse/dependency-tree-parser';
import { buildScannedProjects } from './parse/scanned-project-builder';
import { generateMavenFingerprints } from './fingerprint';
import {
  SnykHttpClient,
  HashAlgorithm,
  FingerprintOptions,
} from './parse/types';

// To enable debugging output, use `snyk -d`
let logger: debugModule.Debugger | null = null;

export function debug(...messages: string[]) {
  if (logger === null) {
    if (process.env.DEBUG) {
      debugModule.enable(process.env.DEBUG);
    }
    logger = debugModule('snyk-mvn-plugin');
  }
  messages.forEach((m) => logger?.(m));
}

export interface MavenOptions extends legacyPlugin.BaseInspectOptions {
  'print-graph'?: boolean;
  scanAllUnmanaged?: boolean;
  allProjects?: boolean;
  mavenAggregateProject?: boolean;
  mavenVerboseIncludeAllVersions?: boolean;
  includeProvenance?: boolean;
  fingerprintAlgorithm?: HashAlgorithm;
  mavenRepository?: string;
}

function buildFingerprintOptions(
  options: MavenOptions,
): FingerprintOptions | undefined {
  if (!options.includeProvenance) {
    return undefined;
  }

  return {
    enabled: true,
    algorithm: options.fingerprintAlgorithm || 'sha1',
    mavenRepository: options.mavenRepository,
  };
}

export async function inspect(
  root: string,
  targetFile?: string,
  options?: MavenOptions,
  snykHttpClient?: SnykHttpClient,
): Promise<legacyPlugin.InspectResult> {
  const targetPath = targetFile
    ? path.resolve(root, targetFile)
    : path.resolve(root);
  if (!fs.existsSync(targetPath)) {
    throw new Error('Could not find file or directory ' + targetPath);
  }
  if (!options) {
    options = {
      dev: false,
      scanAllUnmanaged: false,
      'print-graph': false,
      mavenVerboseIncludeAllVersions: false,
    };
  }
  const fingerprintOptions = buildFingerprintOptions(options);

  if (targetPath && isArchive(targetPath)) {
    debug(`Creating dep-graph from ${targetPath}`);
    const depGraph = await createDepGraphFromArchive(
      root,
      targetPath,
      snykHttpClient,
      fingerprintOptions,
    );
    return {
      plugin: {
        name: 'bundled:maven',
        runtime: 'unknown',
        meta: {},
      },
      package: {}, // using dep-graph over depTree
      dependencyGraph: depGraph,
    };
  }

  if (options.scanAllUnmanaged) {
    const archives = findArchives(root);
    if (archives.length > 0) {
      debug(`Creating dep-graph from archives in ${root}`);
      const depGraph = await createDepGraphFromArchives(
        root,
        archives,
        snykHttpClient,
        fingerprintOptions,
      );
      return {
        plugin: {
          name: 'bundled:maven',
          runtime: 'unknown',
          meta: {},
        },
        package: {}, // using dep-graph over depTree
        dependencyGraph: depGraph,
      };
    } else {
      throw Error(`Could not find any supported files in '${root}'.`);
    }
  }

  // Create Maven context once - handles command detection and working directory
  const mavenContext = createMavenContext(root, targetFile);

  const args = options.args || [];

  const verboseEnabled =
    args.includes('-Dverbose') ||
    args.includes('-Dverbose=true') ||
    !!options['print-graph'];

  let executionResult;
  try {
    // Execute Maven pipeline (resolve + tree)
    executionResult = await executeMavenPipeline(
      mavenContext,
      options.mavenAggregateProject,
      verboseEnabled,
      args,
    );
    debug(
      `Verbose enabled with all versions: ${options.mavenVerboseIncludeAllVersions}`,
    );
    const { mavenGraphs } = parseMavenDependencyTree(
      executionResult.dependencyTreeResult,
      options.mavenVerboseIncludeAllVersions,
      executionResult.versionResolver,
    );

    // Generate fingerprints if enabled
    let fingerprintMap = new Map();
    if (fingerprintOptions?.enabled) {
      fingerprintMap = await generateMavenFingerprints(
        mavenGraphs,
        fingerprintOptions,
        mavenContext.command,
      );
    }

    // Build scanned projects
    const { scannedProjects } = buildScannedProjects(
      mavenGraphs,
      options.dev,
      verboseEnabled,
      fingerprintMap,
      !!fingerprintOptions?.enabled,
    );

    return {
      plugin: {
        name: 'bundled:maven',
        runtime: 'unknown',
        meta: {
          versionBuildInfo: {
            metaBuildVersion: {
              mavenVersion: executionResult.mavenVersion || '',
              javaVersion: executionResult.javaVersion || '',
              mavenPluginVersion: executionResult.mavenPluginVersion || '',
            },
          },
        },
      },
      ...{ scannedProjects },
    };
  } catch (err) {
    if (executionResult) {
      debug(`>>> Output from mvn: ${executionResult.dependencyTreeResult}`);
    }

    // Handle Maven execution errors with proper command information
    if (err instanceof DependencyTreeError) {
      const msg = formatGenericPluginError(
        err.originalError,
        err.command,
        err.args,
      );
      throw new Error(msg);
    }

    // Handle parsing errors (when Maven succeeded but output can't be parsed)
    if (err instanceof Error && executionResult) {
      const msg = formatGenericPluginError(
        err,
        executionResult.command,
        executionResult.args,
      );
      throw new Error(msg);
    }

    // Handle other errors generically
    throw err;
  }
}
