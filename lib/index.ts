import { legacyPlugin } from '@snyk/cli-interface';
import * as fs from 'fs';
import * as path from 'path';
import { executeMavenDependencyTree } from './maven/dependency-tree';
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
    if (executionResult)
      debug(`>>> Output from mvn: ${executionResult.dependencyTreeResult}`);
    if (err instanceof Error) {
      // Use the context for error formatting instead of re-detecting command
      const msg = formatGenericPluginError(err, mavenContext.command, []);
      throw new Error(msg);
    }
    throw err;
  }
}
