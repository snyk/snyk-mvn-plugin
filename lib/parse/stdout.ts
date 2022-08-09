const logLabel = /^\[\w+\]\s*/gm;
const digraph = /digraph([\s\S]*?)\}/g;
const errorLabel = /^\[ERROR\]/gm;

// Parse the output from 'mvn dependency:tree -DoutputType=dot'
export function parseStdout(stdout: string): string[] {
  if (errorLabel.test(stdout)) {
    throw new Error('Maven output contains errors.');
  }
  const digraphs = stdout.replace(logLabel, '').match(digraph);
  if (!digraphs) {
    throw new Error('Cannot find any digraphs.');
  }
  return digraphs;
}
