import { legacyPlugin } from '@snyk/cli-interface';
import * as fs from 'fs';
import * as path from 'path';
import { executeMavenDependencyResolve } from './maven/dependency-resolve';
import { executeMavenDependencyTree } from './maven/dependency-tree';
import { DependencyTreeError } from './maven/errors';
import { createMavenContext } from './maven/context';
import {
  createDepGraphFromArchive,
  createDepGraphFromArchives,
  findArchives,
  isArchive,
} from './archive';
import { formatGenericPluginError } from './error-format';
import * as debugModule from 'debug';
import { parse } from './parse';
import {
  SnykHttpClient,
  HashAlgorithm,
  FingerprintOptions,
} from './parse/types';
import { createVersionResolver } from './parse/version-resolver';

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
  fingerprintArtifacts?: boolean;
  fingerprintAlgorithm?: HashAlgorithm;
  mavenRepository?: string;
}

function buildFingerprintOptions(
  options: MavenOptions,
): FingerprintOptions | undefined {
  if (!options.fingerprintArtifacts) {
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

  let versionResolver;
  try {
    const resolveResult = await executeMavenDependencyResolve(mavenContext, {
      mavenAggregateProject: options.mavenAggregateProject,
      args,
    });
    debug(`Resolve result: ${resolveResult.resolveResult}`);

    // Parse immediately and fail fast if there's an issue
    versionResolver = createVersionResolver(resolveResult.resolveResult);
  } catch (err) {
    debug(`Version resolution failed: ${err}`);
    // Continue without version resolution - graceful degradation
  }

  let executionResult;
  try {
    executionResult = await executeMavenDependencyTree(mavenContext, {
      mavenAggregateProject: options.mavenAggregateProject,
      verboseEnabled,
      args,
    });
    debug(
      `Verbose enabled with all versions: ${options.mavenVerboseIncludeAllVersions}`,
    );
    const parseResult = await parse(
      executionResult.dependencyTreeResult,
      options.dev,
      verboseEnabled,
      options.mavenVerboseIncludeAllVersions,
      fingerprintOptions,
      mavenContext.command,
      versionResolver,
    );

    return {
      plugin: {
        name: 'bundled:maven',
        runtime: 'unknown',
        meta: {
          versionBuildInfo: {
            metaBuildVersion: {
              mavenVersion: executionResult.mavenVersion,
              javaVersion: executionResult.javaVersion,
              mavenPluginVersion: executionResult.mavenPluginVersion,
            },
          },
        },
      },
      ...parseResult,
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
