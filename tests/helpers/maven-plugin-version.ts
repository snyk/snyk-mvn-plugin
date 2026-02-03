/**
 * Maven dependency plugin version utilities for conditional test execution
 */

import { legacyPlugin } from '@snyk/cli-interface';
import { compareVersions } from '../../lib/maven/version';

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
