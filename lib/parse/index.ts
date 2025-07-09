import type { ScannedProject } from '@snyk/cli-interface/legacy/common';

import { parseDigraphsFromStdout } from './stdout';
import { parseDigraphs } from './digraph';
import { buildDepGraph } from './dep-graph';
export { parsePluginVersionFromStdout } from './stdout';

export function parse(
  stdout: string,
  includeTestScope = false,
  verboseEnabled = false,
  mavenVerboseIncludeAllVersions = false,
): { scannedProjects: ScannedProject[] } {
  const digraphs = parseDigraphsFromStdout(stdout);
  const mavenGraphs = parseDigraphs(digraphs, {
    mavenVerboseIncludeAllVersions,
  });
  const scannedProjects: ScannedProject[] = [];
  for (const mavenGraph of mavenGraphs) {
    const depGraph = buildDepGraph(
      mavenGraph,
      includeTestScope,
      verboseEnabled,
    );
    scannedProjects.push({ depGraph });
  }
  return {
    scannedProjects,
  };
}
