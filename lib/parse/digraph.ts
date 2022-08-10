import type { MavenGraph } from './types';
import { MavenGraphBuilder } from './maven-graph-builder';

const newLine = /[\r\n]+/g;

export function parseDigraphs(digraphs: string[]): MavenGraph[] {
  const graphs: MavenGraph[] = [];
  for (const digraph of digraphs) {
    const lines = digraph.split(newLine);
    const rootId = findQuotedContents(lines[0]);
    if (!rootId) {
      throw new Error(
        `Unexpected digraph could not find root node. Could not parse "${lines[0]}".`,
      );
    }
    const builder = new MavenGraphBuilder(rootId);
    for (let i = 1; i < lines.length - 1; i++) {
      const line = parseLine(lines[i]);
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

function parseLine(line?: string): ParsedLine | null {
  if (!line) return null;
  const [left, right] = line.split('->');
  if (!left || !right) return null;
  const from = findQuotedContents(left);
  const to = findQuotedContents(right);
  if (!from || !to) return null;
  return { from, to };
}

function findQuotedContents(value?: string): string | null {
  if (!value) return null;
  const start = value.indexOf('"') + 1;
  const end = value.lastIndexOf('"');
  return value.substring(start, end);
}
