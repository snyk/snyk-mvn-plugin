import type { MavenDependency } from './types';

const UNKNOWN = {
  groupId: 'unknown',
  artifactId: 'unknown',
  type: 'unknown',
  version: 'unknown',
};

export function parseDependency(value: unknown): MavenDependency {
  if (typeof value !== 'string') return UNKNOWN;
  const parts = value.split(':');
  switch (parts.length) {
    // using classifier and scope
    // "com.example:my-app:jar:jdk8:1.2.3:compile"
    case 6: {
      return {
        groupId: parts[0],
        artifactId: parts[1],
        type: parts[2],
        classifier: parts[3],
        version: parts[4],
        scope: parts[5],
      };
    }
    // using scope
    // "com.example:my-app:jar:1.2.3:compile"
    case 5: {
      return {
        groupId: parts[0],
        artifactId: parts[1],
        type: parts[2],
        version: parts[3],
        scope: parts[4],
      };
    }
    // everything else
    // "com.example:my-app:jar:1.2.3"
    case 4: {
      return {
        groupId: parts[0],
        artifactId: parts[1],
        type: parts[2],
        version: parts[3],
      };
    }
    default: {
      return UNKNOWN;
    }
  }
}
