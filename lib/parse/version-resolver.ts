import { parseResolveResult, type ResolvedVersion } from './resolve-parser';

/**
 * Interface for resolving Maven dependency versions from resolveResult output
 */
export interface VersionResolver {
  /**
   * Resolve a metaversion (RELEASE, LATEST) to a concrete version
   * @param groupId The dependency group ID
   * @param artifactId The dependency artifact ID
   * @param projectId Optional project ID for aggregate projects
   * @returns The resolved concrete version, or undefined if not found
   */
  resolveVersion(
    groupId: string,
    artifactId: string,
    projectId?: string,
  ): string | undefined;

  /**
   * Check if a resolution exists for a given dependency
   * @param groupId The dependency group ID
   * @param artifactId The dependency artifact ID
   * @param projectId Optional project ID for aggregate projects
   * @returns True if a resolution exists
   */
  hasResolution(
    groupId: string,
    artifactId: string,
    projectId?: string,
  ): boolean;

  /**
   * Get resolved versions for a specific project
   * @param projectId The project ID
   * @returns Map of dependency keys to resolved versions for the project
   */
  getResolutionsForProject(projectId: string): Map<string, ResolvedVersion>;
}

/**
 * Create a VersionResolver from Maven dependency:resolve output
 *
 * @param resolveResult The raw output from `mvn dependency:resolve`
 * @returns A VersionResolver instance
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

  return {
    resolveVersion(
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

      // No resolution found
      return undefined;
    },

    hasResolution(
      groupId: string,
      artifactId: string,
      projectId?: string,
    ): boolean {
      const key = createDependencyKey(groupId, artifactId);

      // Use provided projectId or fall back to 'default'
      const targetProjectId = projectId || 'default';
      const projectResolutions = projectResolutionMap.get(targetProjectId);

      return projectResolutions ? projectResolutions.has(key) : false;
    },

    getResolutionsForProject(projectId: string): Map<string, ResolvedVersion> {
      return projectResolutionMap.get(projectId) || new Map();
    },
  };
}

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
export function isMetaversion(version: string): boolean {
  return version === 'RELEASE' || version === 'LATEST';
}
