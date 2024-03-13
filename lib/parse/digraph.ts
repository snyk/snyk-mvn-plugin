import type {MavenDependency, MavenGraph} from './types';
import { MavenGraphBuilder } from './maven-graph-builder';
import {dependencyToString, parseDependency} from './dependency';

const newLine = /[\r\n]+/g;

export function parseDigraphs(digraphs: string[], verbose = false): MavenGraph[] {
  const graphs: MavenGraph[] = [];
  for (const digraph of digraphs) {
    const lines = digraph.split(newLine);
    const rootId = findQuotedContents(lines[0], verbose);
    if (!rootId) {
      throw new Error(
        `Unexpected digraph could not find root node. Could not parse "${lines[0]}".`,
      );
    }
    const builder = new MavenGraphBuilder(rootId);
    for (let i = 1; i < lines.length - 1; i++) {
      const line = parseLine(lines[i], verbose);
      if (!line) {
        throw new Error(
          `Unexpected digraph could not connect nodes. Could not parse "${lines[i]}".`,
        );
      }
      builder.connect(line.from, line.to);
    }
    graphs.push(builder.graph);
  }
  return graphs;
}

type ParsedLine = { from: string; to: string };

function parseLine(line?: string, verbose = false): ParsedLine | null {
  if (!line) return null;
  const [left, right] = line.split('->');
  if (!left || !right) return null;
  const from = findQuotedContents(left, verbose);
  const to = findQuotedContents(right, verbose);
  if (!from || !to) return null;
  return { from, to };
}

function findQuotedContents(value?: string, verbose = false): string | null {
  if (!value) return null;
  let start = value.indexOf('"') + 1;
  const end = value.lastIndexOf('"');
  if (verbose) {
    // omitted reasons:
    // https://github.com/apache/maven/blob/ab6ec5bd74af20ab429509eb56fc8e3dff4c7fc7/maven-core/src/main/java/org/apache/maven/internal/impl/DefaultNode.java#L113
    let dependency: MavenDependency;
    if (value.indexOf('omitted for conflict with') > -1) {
      const omittedParts = value.substring(start + 1, end).split(' - omitted for conflict with ');
      return dependencyToString(parseDependency(omittedParts[0], omittedParts[1].slice(0, -1)));
    }
    if (value.indexOf('omitted for duplicate') > -1) {
      const omittedParts = value.substring(start + 1, end).split(' - omitted for duplicate');
      return omittedParts[0].substring(1);
    }
  }
  return value.substring(start, end);
}
