import type { ScannedProject } from '@snyk/cli-interface/legacy/common';

import { buildDepGraph } from './dep-graph';
import { ParseContext, FingerprintData, MavenGraph } from './types';

export function buildScannedProjects(
  mavenGraphs: MavenGraph[],
  includeTestScope = false,
  verboseEnabled = false,
  fingerprintMap = new Map<string, FingerprintData>(),
  includePurl = false,
): { scannedProjects: ScannedProject[] } {
  const context: ParseContext = {
    includeTestScope,
    verboseEnabled,
    fingerprintMap,
    includePurl,
  };

  const scannedProjects: ScannedProject[] = [];
  for (const mavenGraph of mavenGraphs) {
    const depGraph = buildDepGraph(mavenGraph, context);
    scannedProjects.push({ depGraph });
  }

  return { scannedProjects };
}
