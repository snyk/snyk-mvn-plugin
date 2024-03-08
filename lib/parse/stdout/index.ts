import { parseDigraph } from './parse-digraph';
import { parseTree } from './parse-trees';

const logLabel = /\[(\w+)\]/gm;
const errorLabel = /\[ERROR\]/gm;
const successLabel = /\[INFO\] BUILD SUCCESS/gm;

// Parse the output from 'mvn dependency:tree -DoutputType=dot'
export function parseStdout(stdout: string, verbose = false): string[] {
  if (errorLabel.test(stdout) && !successLabel.test(stdout)) {
    throw new Error('Maven output contains errors.');
  }
  const withoutLabels = stdout.replace(logLabel, '');
  const parsedOutputs = verbose
    ? parseTree(withoutLabels)
    : parseDigraph(withoutLabels);
  if (!parsedOutputs) {
    throw new Error(
      verbose ? 'Cannot find any trees.' : 'Cannot find any digraphs.',
    );
  }
  return parsedOutputs;
}
