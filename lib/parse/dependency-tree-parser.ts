import { parseDigraphsFromStdout } from './stdout';
import { parseDigraphs } from './digraph';
import { MavenGraph } from './types';
import type { VersionResolver } from './version-resolver';
export { parsePluginVersionFromStdout } from './stdout';

export function parseMavenDependencyTree(
  stdout: string,
  mavenVerboseIncludeAllVersions = false,
  versionResolver: VersionResolver,
): { mavenGraphs: MavenGraph[] } {
  const digraphs = parseDigraphsFromStdout(stdout);
  const mavenGraphs = parseDigraphs(
    digraphs,
    {
      mavenVerboseIncludeAllVersions,
    },
    versionResolver,
  );

  return { mavenGraphs };
}
