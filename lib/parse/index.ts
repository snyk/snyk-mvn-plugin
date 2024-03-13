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
  const scannedProjects: ScannedProject[] = [];

  try {
    const mavenGraphs = parseDigraphs(parsedOutputs, verboseOutput);
    for (const mavenGraph of mavenGraphs) {
      const depGraph = buildDepGraph(mavenGraph, includeTestScope, verboseOutput);
      scannedProjects.push({ depGraph });
    }
    return { scannedProjects };
  } catch (err) {
    if (verboseOutput) {
      return { scannedProjects: parseTrees(parsedOutputs) };
    }
  }
  return { scannedProjects };
}
