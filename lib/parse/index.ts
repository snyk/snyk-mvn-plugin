import type { ScannedProject } from '@snyk/cli-interface/legacy/common';

import { parseStdout } from './stdout';
import { parseDigraphs } from './digraph';
import { buildDepGraph } from './dep-graph';

export function parse(
  stdout: string,
  includeTestScope = false,
): { scannedProjects: ScannedProject[] } {
  const digraphs = parseStdout(stdout);
  const mavenGraphs = parseDigraphs(digraphs);
  const scannedProjects: ScannedProject[] = [];
  for (const mavenGraph of mavenGraphs) {
    const depGraph = buildDepGraph(mavenGraph, includeTestScope);
    scannedProjects.push({ depGraph });
  }
  return {
    scannedProjects,
  };
}
