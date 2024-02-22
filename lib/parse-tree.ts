import { ParsedNode, MavenDependency } from './interfaces';

function parseLine(line) {
  // Updated regex to match groupId, artifactId, version, and scope without leading symbols
  const regex = /([\w\.-]+):([\w\.-]+):jar:([\w\.-]+):(\w+)/;
  const match = line.match(regex);
  if (match) {
    return {
      groupId: match[1],
      artifactId: match[2],
      version: match[3],
      scope: match[4],
    };
  }
  return null;
}

export function parseMavenDependencyTree(tree: string): ParsedNode | null {
  const lines = tree.split('\n');
  const root: ParsedNode = { dependency: { groupId: '', artifactId: '', version: '', scope: '' }, children: [] };
  const stack: { node: ParsedNode; level: number }[] = [{ node: root, level: -1 }];

  lines.forEach(line => {
    // Calculate level based on indentation (2 spaces per level)
    const level = (line.lastIndexOf('+') > 0 ? line.lastIndexOf('+') : line.indexOf('\-')) / 2; // Calculate level based on indentation

    const dependency = parseLine(line.trim());
    if (dependency) {
      const currentNode: ParsedNode = { dependency, children: [] };
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop(); // Pop until finding the parent level
      }
      if (stack.length > 0) {
        stack[stack.length - 1].node.children.push(currentNode);
      }
      stack.push({ node: currentNode, level });
    }

  });

  return root.children.length > 0 ? root.children[0] : null; // Return the first child as the root node
}
