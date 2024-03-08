import { DepGraphBuilder } from '@snyk/dep-graph';
import { parseDependency } from './dependency';
import { MavenDependency } from './types';
import { ScannedProject } from '@snyk/cli-interface/legacy/common';

export function parseTrees(trees: string[]): ScannedProject[] {
  const scannedProjects: ScannedProject[] = [];
  for (const tree of trees) {
    const parser = new TreeParser(tree);
    scannedProjects.push({
      depGraph: parser.DepGraphBuilderFromParser().build(),
    });
  }
  return scannedProjects;
}
class TreeParser {
  private lines: string[] = [];
  private lineIndex = 0;
  private resolvedVersions: Map<string, string> = new Map<string, string>();

  constructor(input: string) {
    this.lines = input.trim().split('\n');
  }

  private computeResolvedVersions(lines: string[]): void {
    for (const line of lines) {
      const parts = line.trim().split('\n'); // Split on whitespace
      const isOmitted = parts[0].indexOf('omitted') > -1;

      if (isOmitted) {
        continue;
      }

      const artifactInfo = parts[0].replace(/^\W+/, '');
      const values = artifactInfo.split(':');
      const name = `${values[0]}:${values[1]}`;
      const version = values[4];
      const currentVersion = this.resolvedVersions.get(name);

      if (currentVersion && currentVersion >= version) {
        continue;
      }

      this.resolvedVersions.set(`${values[0]}:${values[1]}`, values[3]);
    }
  }

  public DepGraphBuilderFromParser(): DepGraphBuilder {
    if (this.lines.length === 0) {
      throw new Error('No input lines provided.');
    }

    if (this.lines[0].includes('maven-dependency-plugin')) {
      this.lines.shift();
    }

    const rootNode = this.extractArtifact(this.lines[0]);
    if (!rootNode) {
      throw new Error('something went wrong');
    }

    const depGraphBuilder = new DepGraphBuilder(
      { name: 'maven' },
      {
        name: `${rootNode.groupId}:${rootNode.artifactId}`,
        version: rootNode.version,
      },
    );

    // Compute resolved versions this way during parsing we pick correct versions for omitted deps conflicts
    this.computeResolvedVersions(this.lines.join('\n').split('\n'));

    // Parse dependencies starting from the first dependency line
    this.lineIndex = 1; // Start parsing from the second line as the first line is the root package
    const depth = 0;
    while (this.lineIndex < this.lines.length) {
      const currentDepth = this.computeDepth(this.lines[this.lineIndex]);

      if (currentDepth < depth) {
        break;
      }

      this.parseInternal(depth, depGraphBuilder, depGraphBuilder.rootNodeId);
    }

    return depGraphBuilder;
  }

  private parseInternal(
    depth: number,
    depGraphBuilder: DepGraphBuilder,
    parentId: string,
  ) {
    while (this.lineIndex < this.lines.length) {
      const currentDepth = this.computeDepth(this.lines[this.lineIndex]);

      if (currentDepth < depth) {
        break;
      }

      const node = this.extractArtifact(this.lines[this.lineIndex]);
      const name = `${node.groupId}:${node.artifactId}`;
      const version = this.resolvedVersions.get(name) || node.version;
      const nodeId = `${name}:${version}`;

      depGraphBuilder.addPkgNode(
        {
          name,
          version,
        },
        nodeId,
      );
      depGraphBuilder.connectDep(parentId, nodeId);
      this.lineIndex++; // Move to the next line

      // Now handle children of the current node
      if (
        this.lineIndex < this.lines.length &&
        this.computeDepth(this.lines[this.lineIndex]) > currentDepth
      ) {
        // Parse children
        this.parseInternal(currentDepth - 1, depGraphBuilder, nodeId);
      }
    }
  }

  private extractArtifact(line: string): MavenDependency {
    // if the format is not from digraph we need to remove leading +-\
    const cleanedUpLineMatch = line.match(/(\w[\w\s.:-]*)/);
    if (!cleanedUpLineMatch)
      throw new Error('error parsing mvn -Dverbose output');
    line = cleanedUpLineMatch[0];
    // omitted reasons:
    // https://github.com/apache/maven/blob/ab6ec5bd74af20ab429509eb56fc8e3dff4c7fc7/maven-core/src/main/java/org/apache/maven/internal/impl/DefaultNode.java#L113
    if (line.indexOf('omitted for conflict with') > -1) {
      const omittedParts = line.split(' - omitted for conflict with ');
      return parseDependency(omittedParts[0], omittedParts[1]);
    }
    if (line.indexOf('omitted for duplicate') > -1) {
      const omittedParts = line.split(' - omitted for duplicate');
      return parseDependency(omittedParts[0]);
    }
    return parseDependency(line);
  }

  private computeDepth(line: string): number {
    for (let i = 0; i < line.length; i++) {
      if (![' ', '|', '+', '\\', '-', '<'].includes(line[i])) {
        return i / 3;
      }
    }
    return -1 / 3;
  }
}
