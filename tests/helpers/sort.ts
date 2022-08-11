import type { PkgInfo } from '@snyk/dep-graph';

export function byPkgName(a: PkgInfo, b: PkgInfo): number {
  return a.name.length - b.name.length;
}
