import * as subProcess from '../sub-process';
import { parseVersions } from '../parse-versions';
import { MavenContext } from './context';

// Plugin version 3.9.0 requires Maven 3.6.3+
// Fall back to 3.6.1 for older Maven versions
export const MAVEN_DEPENDENCY_PLUGIN_VERSION = '3.9.0';
export const MAVEN_DEPENDENCY_PLUGIN_VERSION_LEGACY = '3.6.1';
const MIN_MAVEN_VERSION_FOR_PLUGIN = '3.6.3';

/**
 * Gets the Maven version by running `mvn --version`
 */
export async function getMavenVersion(
  context: MavenContext,
): Promise<{ javaVersion: string; mavenVersion: string }> {
  const versionResult = await subProcess.execute(
    context.command,
    ['--version'],
    {
      cwd: context.workingDirectory,
    },
  );
  return parseVersions(versionResult);
}

/**
 * Compares two version strings (e.g., "3.6.3" vs "3.9.0")
 * @returns -1 if a < b, 0 if equal, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const partA = partsA[i] || 0;
    const partB = partsB[i] || 0;
    if (partA < partB) return -1;
    if (partA > partB) return 1;
  }
  return 0;
}

/**
 * Extracts the numeric version from Maven version string
 * e.g., "Apache Maven 3.9.6 (...)" -> "3.9.6"
 */
function extractMavenVersionNumber(mavenVersion: string): string | null {
  const match = mavenVersion.match(/Apache Maven (\d+\.\d+\.\d+)/);
  return match ? match[1] : null;
}

/**
 * Selects the appropriate plugin version based on Maven version
 * Uses 3.9.0 for Maven 3.6.3+, falls back to 3.6.1 for older versions
 */
export function selectPluginVersion(mavenVersion: string): string {
  const versionStr = extractMavenVersionNumber(mavenVersion);
  if (
    versionStr &&
    compareVersions(versionStr, MIN_MAVEN_VERSION_FOR_PLUGIN) >= 0
  ) {
    return MAVEN_DEPENDENCY_PLUGIN_VERSION;
  }
  return MAVEN_DEPENDENCY_PLUGIN_VERSION_LEGACY;
}
