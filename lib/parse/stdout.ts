import { parseDigraph } from '../parse-digraph';

const logLabel = /^\[\w+\]\s*/gm;
const errorLabel = /^\[ERROR\]/gm;
const successLabel = /^\[INFO\] BUILD SUCCESS/gm;

// Parse the output from 'mvn dependency:tree -DoutputType=dot'
export function parseStdout(stdout: string): string[] {
  if (errorLabel.test(stdout) && !successLabel.test(stdout)) {
    throw new Error('Maven output contains errors.');
  }
  const withoutLabels = stdout.replace(logLabel, '');
  const digraphs = parseDigraph(withoutLabels);
  if (!digraphs) {
    throw new Error('Cannot find any digraphs.');
  }
  return digraphs;
}
