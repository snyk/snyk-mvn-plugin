import type { ScannedProject } from '@snyk/cli-interface/legacy/common';

import { parseStdout } from './stdout';
import { parseDigraphs } from './digraph';
import { parseTrees } from './tree';
import { buildDepGraph } from './dep-graph';

export function parse(
  stdout: string,
  includeTestScope = false,
  verboseOutput = false,
): { scannedProjects: ScannedProject[] } {
  const parsedOutputs = parseStdout(stdout, verboseOutput);
  if (verboseOutput) {
    return { scannedProjects: parseTrees(parsedOutputs) };
  }

  const mavenGraphs = parseDigraphs(parsedOutputs);
  const scannedProjects: ScannedProject[] = [];
  for (const mavenGraph of mavenGraphs) {
    const depGraph = buildDepGraph(mavenGraph, includeTestScope);
    scannedProjects.push({ depGraph });
  }
  return {
    scannedProjects,
  };
}
