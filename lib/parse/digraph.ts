import type { MavenDependency, MavenGraph } from './types';
import { MavenGraphBuilder } from './maven-graph-builder';
import { buildDependencyString, parseDependency } from './dependency';

type ParseOptions = {
  mavenVerboseIncludeAllVersions: boolean;
};

const DEFAULT_PARSE_OPTIONS = { mavenVerboseIncludeAllVersions: false };

const newLine = /[\r\n]+/g;

export function parseDigraphs(
  digraphs: string[],
  options: ParseOptions = DEFAULT_PARSE_OPTIONS,
): MavenGraph[] {
  const graphs: MavenGraph[] = [];
  for (const digraph of digraphs) {
    const lines = digraph.split(newLine);
    const rootId = findQuotedContents(options, lines[0]);
    if (!rootId) {
      throw new Error(
        `Unexpected digraph could not find root node. Could not parse "${lines[0]}".`,
      );
    }
    const builder = new MavenGraphBuilder(rootId);
    for (let i = 1; i < lines.length - 1; i++) {
      const line = parseLine(options, lines[i]);
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

function parseLine(options: ParseOptions, line?: string): ParsedLine | null {
  if (!line) return null;
  const [left, right] = line.split('->');
  if (!left || !right) return null;
  const from = findQuotedContents(options, left);
  const to = findQuotedContents(options, right);
  if (!from || !to) return null;
  return { from, to };
}

function findQuotedContents(
  options: ParseOptions,
  value?: string,
): string | null {
  if (!value) return null;
  const start = value.indexOf('"') + 1;
  const end = value.lastIndexOf('"');

  if (
    options.mavenVerboseIncludeAllVersions === false &&
    isVerboseVersionOmittedForConflict(value)
  ) {
    const [ommitedDep, conflictString] = value
      .substring(start + (value[start] == '(' ? 1 : 0), end)
      .split(/ [-(]/);
    const resolvedVersion = conflictString
      .split('omitted for conflict with ')[1]
      .split(')')[0];
    const parsedDep = parseDependency(ommitedDep);
    const resolvedDep: MavenDependency = {
      ...parsedDep,
      version: resolvedVersion,
    };
    return buildDependencyString(resolvedDep);
  }

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
    'omitted for duplicate',
    'omitted for conflict with',
    'scope not updated to compile',
    'scope not updated to runtime',
    'scope not updated to test',
  ];
  for (const dverboseReason of dverboseReasons) {
    if (value.includes(dverboseReason)) return true;
  }
  return false;
}

function isVerboseVersionOmittedForConflict(value: string): boolean {
  const dverboseReasons = ['omitted for conflict with'];
  for (const dverboseReason of dverboseReasons) {
    if (value.includes(dverboseReason)) return true;
  }
  return false;
}
