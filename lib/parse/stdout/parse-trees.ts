const regex = /maven-dependency-plugin:.*:tree.*\n([\s\S]*?)-\s*?$/gm;

export function parseTree(text: string): string[] | null {
  const result = text.match(regex);
  return result || null;
}
