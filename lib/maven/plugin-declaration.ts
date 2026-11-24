import { MavenContext } from './context';

/**
 * Stub: always keep the previous bare `dependency:tree` behaviour.
 * The failing tests for FRG-707 show where pinning should apply; the next
 * commit replaces this with the real decision.
 */
export function shouldPinDependencyPlugin(
  _context: MavenContext,
  _mavenAggregateProject: boolean,
  _mavenArgs: string[],
  _mavenVersion: string | undefined,
): boolean {
  return false;
}
