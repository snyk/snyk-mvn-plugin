const regex = /digraph([\s\S]*?)\}[\s]*?$/gm;

export function parseDigraph(text: string): string[] | null {
  const result = text.match(regex);
  return result || null;
}
