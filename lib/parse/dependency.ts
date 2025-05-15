import type { MavenDependency } from './types';

const UNKNOWN = 'unknown';

const unknownDependency: MavenDependency = {
  groupId: UNKNOWN,
  artifactId: UNKNOWN,
  type: UNKNOWN,
  version: UNKNOWN,
};

export function parseDependency(value: unknown): MavenDependency {
  if (typeof value !== 'string') return unknownDependency;
  const parts = value.split(':');
  switch (parts.length) {
    // using classifier and scope
    // "com.example:my-app:jar:jdk8:1.2.3:compile"
    case 6: {
      return {
        groupId: getPart(parts, 0),
        artifactId: getPart(parts, 1),
        type: getPart(parts, 2),
        classifier: getPart(parts, 3),
        version: getPart(parts, 4),
        scope: getPart(parts, 5),
      };
    }
    // using scope
    // "com.example:my-app:jar:1.2.3:compile"
    case 5: {
      return {
        groupId: getPart(parts, 0),
        artifactId: getPart(parts, 1),
        type: getPart(parts, 2),
        version: getPart(parts, 3),
        scope: getPart(parts, 4),
      };
    }
    // everything else
    // "com.example:my-app:jar:1.2.3"
    case 4: {
      return {
        groupId: getPart(parts, 0),
        artifactId: getPart(parts, 1),
        type: getPart(parts, 2),
        version: getPart(parts, 3),
      };
    }
    default: {
      return unknownDependency;
    }
  }
}

export function buildDependencyString(dependency: MavenDependency): string {
  const parts: string[] = [
    formatMavenPart(dependency.groupId),
    formatMavenPart(dependency.artifactId),
    formatMavenPart(dependency.type),
    formatMavenPart(dependency.version),
  ];

  if (dependency.scope) {
    parts.push(formatMavenPart(dependency.scope));
  }
  if (dependency.classifier) {
    parts.splice(3, 0, formatMavenPart(dependency.classifier));
  }

  return parts.join(':');
}

function getPart(parts: string[], index: number): string {
  return parts[index] || UNKNOWN;
}

function formatMavenPart(part: string): string {
  return part == UNKNOWN ? '' : part;
}
