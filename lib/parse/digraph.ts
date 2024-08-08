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

  if (isVerbose(value)) {
    const [left] = value
      .substring(start + (value[start] == '(' ? 1 : 0), end)
      .split(/ [-(]/);
    return left;
  }

  return value.substring(start, end);
}

function isVerbose(value: string): boolean {
  // clear string of leading and trailing non letters
  // when using -Dverbose ensure omitted reasons are parsed correctly
  // https://github.com/apache/maven/blob/ab6ec5bd74af20ab429509eb56fc8e3dff4c7fc7/maven-core/src/main/java/org/apache/maven/internal/impl/DefaultNode.java#L113
  const dverboseReasons = [
    'version managed from',
    'omitted for conflict with',
    'omitted for duplicate',
  ];
  for (const dverboseReason of dverboseReasons) {
    if (value.includes(dverboseReason)) return true;
  }
  return false;
}
