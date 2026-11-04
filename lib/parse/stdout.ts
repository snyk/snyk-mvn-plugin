import { parseDigraph } from '../parse-digraph';

const logLabel = /^\[\w+\]\s*/gm;
const errorLabel = /^\[ERROR\]/m;
const successLabel = /^\[INFO\] BUILD SUCCESS/m;
// JVM unified logging (JDK 9+, e.g. -Xlog:gc), e.g.
// "[4.326s][info][gc] GC(9) Pause Young (Normal) 24M->8M(64M) 3.1ms".
// Decorators are optional; the level is always lowercase, which keeps
// Maven's uppercase "[INFO]" labels out of the match. These lines reach
// stdout when the JVM logs GC to stdout and must not reach the digraph parser.
const jvmUnifiedLogLine =
  /^(?:\[[^\]\n]*\])*\[(?:trace|debug|info|warning|error)\s*\]\[[\w,+-]+\s*\].*(?:\r?\n|$)/gm;
const mavenDependencyPluginRegex =
  /(?:maven-dependency-plugin|dependency):(\d+\.\d+)(\.\d+)?:tree/m;

function cleanStdout(stdout: string): string {
  if (errorLabel.test(stdout) && !successLabel.test(stdout)) {
    throw new Error('Maven output contains errors.');
  }
  // Strip JVM log lines both before and after the Maven label strip, so a
  // line Maven prefixed with "[INFO] " is removed too.
  return stdout
    .replace(jvmUnifiedLogLine, '')
    .replace(logLabel, '')
    .replace(jvmUnifiedLogLine, '');
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
