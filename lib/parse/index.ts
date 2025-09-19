import type { ScannedProject } from '@snyk/cli-interface/legacy/common';

import { parseDigraphsFromStdout } from './stdout';
import { parseDigraphs } from './digraph';
import { buildDepGraph } from './dep-graph';
import { FingerprintOptions, ParseContext } from './types';
import { generateFingerprints, reportFingerprintTiming } from '../fingerprint';
export { parsePluginVersionFromStdout } from './stdout';

export async function parse(
  stdout: string,
  includeTestScope = false,
  verboseEnabled = false,
  mavenVerboseIncludeAllVersions = false,
  fingerprintOptions?: FingerprintOptions,
  mavenCommand?: string,
): Promise<{ scannedProjects: ScannedProject[] }> {
  const digraphs = parseDigraphsFromStdout(stdout);
  const mavenGraphs = parseDigraphs(digraphs, {
    mavenVerboseIncludeAllVersions,
  });

  // Generate fingerprints between parsing and building dep-graphs
  let fingerprintMap = new Map();

  if (fingerprintOptions?.enabled && mavenCommand) {
    fingerprintMap = await generateFingerprints(
      mavenGraphs,
      fingerprintOptions,
      mavenCommand,
    );

    reportFingerprintTiming(fingerprintMap);
  }

  const context: ParseContext = {
    includeTestScope,
    verboseEnabled,
    fingerprintMap,
    includePurl: !!fingerprintOptions?.enabled,
  };
  const scannedProjects: ScannedProject[] = [];
  for (const mavenGraph of mavenGraphs) {
    const depGraph = buildDepGraph(mavenGraph, context);
    scannedProjects.push({ depGraph });
  }
  return {
    scannedProjects,
  };
}
