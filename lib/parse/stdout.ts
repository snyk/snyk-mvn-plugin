import { parseDigraph } from '../parse-digraph';

const logLabel = /^\[\w+\]\s*/gm;
const errorLabel = /^\[ERROR\]/gm;
const successLabel = /^\[INFO\] BUILD SUCCESS/gm;
const mavenDependencyPluginRegex =
  /maven-dependency-plugin:(\d\.\d)(\.\d)?:tree/gm;

function cleanStdout(stdout: string): string {
  if (errorLabel.test(stdout) && !successLabel.test(stdout)) {
    throw new Error('Maven output contains errors.');
  }
  return stdout.replace(logLabel, '');
}
// Parse the output from 'mvn dependency:tree -DoutputType=dot'
export function parseDigraphsFromStdout(stdout: string): string[] {
  const cleanedStdout = cleanStdout(stdout);
  const digraphs = parseDigraph(cleanedStdout);
  if (!digraphs) {
    throw new Error('Cannot find any digraphs.');
  }
  return digraphs;
}

export function parsePluginVersionFromStdout(stdout: string): string {
  const cleanedStdout = cleanStdout(stdout);
  const versionRes = mavenDependencyPluginRegex.exec(cleanedStdout);
  return versionRes ? `${versionRes[1]}${versionRes[2] || ''}` : '';
}
