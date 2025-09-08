export interface ResolvedVersion {
  groupId: string;
  artifactId: string;
  version: string;
  scope?: string;
  type?: string;
  classifier?: string;
  projectId?: string;
}

/**
 * Parse Maven dependency:resolve output to extract resolved versions
 *
 * Handles both simple and aggregate project outputs:
 * - Simple: Single project with resolved dependencies
 * - Aggregate: Multiple projects with their respective resolved dependencies
 *
 * Example input:
 * [INFO] The following files have been resolved:
 * [INFO]    org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile -- module resteasy.core (auto)
 * [INFO]    org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile -- module org.jboss.logging
 */
export function parseResolveResult(resolveResult: string): ResolvedVersion[] {
  const resolvedVersions: ResolvedVersion[] = [];
  const lines = resolveResult.split('\n');

  let currentProjectId: string | undefined;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and non-INFO lines
    if (!trimmedLine.startsWith('[INFO]')) {
      continue;
    }

    // Extract project ID from project header lines
    const projectMatch = trimmedLine.match(
      /\[INFO\]\s*[-<]+\s*<([^>]+)>\s*[-<]+/,
    );
    if (projectMatch) {
      currentProjectId = projectMatch[1].trim();
      continue;
    }

    // Skip the "The following files have been resolved:" line
    if (trimmedLine.includes('The following files have been resolved:')) {
      continue;
    }

    // Skip "none" lines
    if (trimmedLine.includes('none')) {
      continue;
    }

    // Parse dependency resolution lines - look for pattern: groupId:artifactId:type:version:scope
    const depMatch = trimmedLine.match(
      /\[INFO\]\s+([a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+(?::[a-zA-Z0-9._-]+)?)(?:\s+--\s+module\s+.+)?$/,
    );
    if (depMatch) {
      const depString = depMatch[1];
      const resolvedVersion = parseDependencyString(
        depString,
        currentProjectId,
      );
      if (resolvedVersion) {
        resolvedVersions.push(resolvedVersion);
      }
    }
  }

  return resolvedVersions;
}

/**
 * Parse a single dependency string from Maven resolve output
 *
 * Examples:
 * - "org.jboss.resteasy:resteasy-core:jar:7.0.0.Beta1:compile"
 * - "org.jboss.logging:jboss-logging:jar:3.6.1.Final:compile"
 * - "junit:junit:jar:4.13.2:test"
 */
function parseDependencyString(
  depString: string,
  projectId?: string,
): ResolvedVersion | null {
  const parts = depString.split(':');

  // Expected format: groupId:artifactId:type:version:scope
  if (parts.length < 4) {
    return null;
  }

  const [groupId, artifactId, type, version, scope] = parts;

  // Skip if any required parts are missing
  if (!groupId || !artifactId || !type || !version) {
    return null;
  }

  return {
    groupId,
    artifactId,
    version,
    type,
    scope: scope || undefined,
    projectId,
  };
}
