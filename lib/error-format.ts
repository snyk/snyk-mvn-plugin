export function formatCallGraphError(error: Error): string {
  if (error.message === 'Could not find target folder') {
    return 'Failed to scan for reachable vulns. Please compile your code by running `mvn compile` and try again.';
  }
  if (error.message === 'No entrypoints found') {
    return 'Failed to scan for reachable vulns. Couldn\'t find the application entry point.';
  }
  return 'Failed to scan for reachable vulns. Please contact our support or submit an issue at https://github.com/snyk/java-call-graph-builder/issues.';
}

export function formatGenericPluginError(
  error: Error,
  mavenCommand: string,
  mvnArgs: string[],
): string {
  const fullCommand = [mavenCommand, ...mvnArgs].join(' ');
  const mvnwCommandTipMessage =
    'Currently, you cannot run `mvnw` outside your current directory, you will have to go inside the directory of your project (see: https://github.com/takari/maven-wrapper/issues/133)\n\n';
  return (
    error.message +
    '\n\n' +
    'Please make sure that Apache Maven Dependency Plugin ' +
    'version 2.2 or above is installed, and that `' +
    fullCommand +
    '` executes successfully ' +
    'on this project.\n\n' +
    (mavenCommand.indexOf('mvnw') >= 0 ? mvnwCommandTipMessage : '') +
    'If the problem persists, collect the output of `' +
    fullCommand +
    '` and contact support@snyk.io\n'
  );
}
