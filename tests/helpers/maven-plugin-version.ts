/**
 * Maven dependency plugin version utilities for conditional test execution
 */

import { legacyPlugin } from '@snyk/cli-interface';

/**
 * Extracts plugin version from inspect result metadata
 * @param inspectResult - Result from plugin.inspect call
 * @returns The dependency plugin version string (e.g., "3.7.0")
 */
export function getPluginVersionFromInspectResult(
  inspectResult: legacyPlugin.InspectResult,
): string {
  return (
    inspectResult.plugin.meta?.versionBuildInfo?.metaBuildVersion
      ?.mavenPluginVersion || ''
  );
}

/**
 * Checks if a plugin version meets the minimum threshold
 * @param pluginVersion - Version to check (e.g., "3.7.0")
 * @param targetVersion - Version to compare against (e.g., "3.6.0")
 * @returns true if pluginVersion >= targetVersion
 */
export function isPluginVersionAtLeast(
  pluginVersion: string,
  targetVersion: string,
): boolean {
  return compareVersions(pluginVersion, targetVersion) >= 0;
}

/**
 * Compares two version strings
 * @param version1 - First version to compare
 * @param version2 - Second version to compare
 * @returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2
 */
function compareVersions(version1: string, version2: string): number {
  const parts1 = version1.split('.').map(Number);
  const parts2 = version2.split('.').map(Number);

  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;

    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }

  return 0;
}
