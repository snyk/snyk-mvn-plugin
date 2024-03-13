import type { MavenDependency } from './types';

const UNKNOWN = 'unknown';

const unknownDependency: MavenDependency = {
  groupId: UNKNOWN,
  artifactId: UNKNOWN,
  type: UNKNOWN,
  version: UNKNOWN,
};

export function parseDependency(
  value: unknown,
  versionOverride?: string,
): MavenDependency {
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
        version: versionOverride || getPart(parts, 4),
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
        version: versionOverride || getPart(parts, 3),
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
        version: versionOverride || getPart(parts, 3),
      };
    }
    default: {
      return unknownDependency;
    }
  }
}

export function dependencyToString (dependency: MavenDependency) {
  return `${dependency.groupId}:${dependency.artifactId}:${dependency.type}` +
    (dependency.classifier ? `:${dependency.classifier}` : '') +
    `:${dependency.version}` +
    (dependency.scope ? `:${dependency.scope}` : '');
}

export function parseOmittedVersion (value: string) {
  // omitted reasons:
  // https://github.com/apache/maven/blob/ab6ec5bd74af20ab429509eb56fc8e3dff4c7fc7/maven-core/src/main/java/org/apache/maven/internal/impl/DefaultNode.java#L113
  if (value.indexOf('omitted for conflict with') > -1) {
    const omittedParts = value.split(' - omitted for conflict with ');
    return parseDependency(omittedParts[0], omittedParts[1]);
  }
  if (value.indexOf('omitted for duplicate') > -1) {
    const omittedParts = value.split(' - omitted for duplicate');
    return parseDependency(omittedParts[0]);
  }
  return parseDependency(value);
}

function getPart(parts: string[], index: number): string {
  return parts[index] || UNKNOWN;
}
