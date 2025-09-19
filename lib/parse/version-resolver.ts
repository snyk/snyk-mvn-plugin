import { parseResolveResult, type ResolvedVersion } from './resolve-parser';
import { parseDependency, buildDependencyString } from './dependency';

/**
 * Create a dependency key for lookups
 * @param groupId The dependency group ID
 * @param artifactId The dependency artifact ID
 * @returns A key string for the dependency
 */
function createDependencyKey(groupId: string, artifactId: string): string {
  return `${groupId}:${artifactId}`;
}

/**
 * Check if a version is a metaversion that needs resolution
 * @param version The version string to check
 * @returns True if the version is a metaversion
 */
function isMetaversion(version: string): boolean {
  return version === 'RELEASE' || version === 'LATEST';
}

/**
 * Interface for resolving Maven dependency versions from resolveResult output
 */
export interface VersionResolver {
  /**
   * Resolve a full dependency ID, handling metaversions if present
   * @param dependencyId The full dependency ID (e.g., "groupId:artifactId:type:version:scope")
   * @param projectId Optional project ID for aggregate projects
   * @returns The dependency ID with resolved versions, or original if no resolution needed/possible
   */
  resolveDependencyId(dependencyId: string, projectId?: string): string;
}

/**
 * Create a VersionResolver from Maven dependency:resolve output
 *
 * @param resolveResult The raw output from `mvn dependency:resolve`
 * @returns A VersionResolver instance
 *
 * Note: For older Maven versions (e.g., 3.3.9) that don't provide proper project
 * separation in resolve output, all resolutions are stored under 'default' project.
 * This can cause issues in rare edge cases where multiple modules have conflicting
 * versions of the same dependency (e.g., one uses LATEST, another uses fixed version).
 * In such cases, the last resolved version wins. This requires: EOL Maven version +
 * metaversions + conflicting version strategies - an extremely unlikely scenario.
 */
export function createVersionResolver(resolveResult: string): VersionResolver {
  const resolvedVersions = parseResolveResult(resolveResult);
  const projectResolutionMap = new Map<string, Map<string, ResolvedVersion>>();

  // Build project-specific resolution maps
  for (const resolvedVersion of resolvedVersions) {
    const key = createDependencyKey(
      resolvedVersion.groupId,
      resolvedVersion.artifactId,
    );

    // Use projectId if available, otherwise use a default project
    const projectId = resolvedVersion.projectId || 'default';

    if (!projectResolutionMap.has(projectId)) {
      projectResolutionMap.set(projectId, new Map());
    }
    projectResolutionMap.get(projectId)?.set(key, resolvedVersion);
  }

  // Private helper function in closure - not exposed in interface
  function resolveVersion(
    groupId: string,
    artifactId: string,
    projectId?: string,
  ): string | undefined {
    const key = createDependencyKey(groupId, artifactId);

    // Use provided projectId or fall back to 'default'
    const targetProjectId = projectId || 'default';
    const projectResolutions = projectResolutionMap.get(targetProjectId);

    if (projectResolutions && projectResolutions.has(key)) {
      return projectResolutions.get(key)?.version;
    }

    // Fallback: if not found in specific project, try 'default'
    // This handles cases where older Maven versions don't provide proper project separation
    if (targetProjectId !== 'default') {
      const defaultResolutions = projectResolutionMap.get('default');
      if (defaultResolutions && defaultResolutions.has(key)) {
        return defaultResolutions.get(key)?.version;
      }
    }

    // No resolution found
    return undefined;
  }

  return {
    resolveDependencyId(dependencyId: string, projectId?: string): string {
      const dependency = parseDependency(dependencyId);

      // Only resolve if this is a metaversion
      if (!isMetaversion(dependency.version)) {
        return dependencyId;
      }

      // Try to resolve the metaversion using private helper
      const resolvedVersion = resolveVersion(
        dependency.groupId,
        dependency.artifactId,
        projectId,
      );

      if (resolvedVersion) {
        // Build new dependency string with resolved version
        const resolvedDependency = {
          ...dependency,
          version: resolvedVersion,
        };
        return buildDependencyString(resolvedDependency);
      }

      // If resolution failed, return original ID
      return dependencyId;
    },
  };
}

/**
 * Singleton no-op VersionResolver (Null Object pattern)
 *
 * Used when no metaversions are detected or when dependency:resolve fails.
 * Implements the VersionResolver interface but performs no actual resolution.
 *
 * Since no-op resolvers are stateless, we export a singleton to avoid creating
 * multiple instances unnecessarily.
 */
export const NO_OP_VERSION_RESOLVER: VersionResolver = {
  resolveDependencyId(dependencyId: string): string {
    // No-op: never resolves, always returns original
    return dependencyId;
  },
};
