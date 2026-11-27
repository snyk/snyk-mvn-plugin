import * as fs from 'fs';
import * as path from 'path';
import { debug } from '../index';
import { MavenContext } from './context';

// Anything that looks like a reference to the dependency plugin, including
// version properties such as `maven-dependency-plugin.version`.
const DEPENDENCY_PLUGIN_MENTION = /dependency[-.]plugin/i;
const PARENT_ELEMENT = /<parent[\s>]/;
const PROJECT_OPEN = /<project[\s>]/;
const PROJECT_CLOSE = /<\/project>\s*$/;
const MAVEN_VERSION = /Apache Maven \d+\.\d+\.\d+/;

function resolvePomPath(context: MavenContext): string {
  const target = context.targetPath;
  try {
    if (fs.statSync(target).isDirectory()) {
      return path.join(target, 'pom.xml');
    }
  } catch {
    // fall through: a missing file is handled by the caller's read
  }
  return target;
}

/**
 * Decides whether a non-verbose `dependency:tree` may be pinned to an explicit
 * maven-dependency-plugin version.
 *
 * Pinning overrides any plugin version the customer declared in their POM
 * (`<build><plugins>` or `<pluginManagement>`), which is often a deliberate
 * workaround for Maven's old default plugin version. We therefore only pin when
 * we can positively show that nothing could be declaring a version, and keep
 * the previous behaviour (bare `dependency:tree`) in every uncertain case:
 *
 *  - aggregate scans (module POMs and their parents are not inspected)
 *  - the Maven version could not be detected
 *  - user supplied Maven args mention the dependency plugin
 *  - the POM cannot be read, or does not look like a complete project document
 *  - the POM text mentions the dependency plugin anywhere (build, profiles,
 *    pluginManagement, properties, comments)
 *  - the POM has a `<parent>`, which we cannot read (it may manage the plugin)
 */
export function shouldPinDependencyPlugin(
  context: MavenContext,
  mavenAggregateProject: boolean,
  mavenArgs: string[],
  mavenVersion: string | undefined,
): boolean {
  if (mavenAggregateProject) {
    return false;
  }
  if (!mavenVersion || !MAVEN_VERSION.test(mavenVersion)) {
    return false;
  }
  if (mavenArgs.some((arg) => DEPENDENCY_PLUGIN_MENTION.test(arg))) {
    return false;
  }

  let pom: string;
  try {
    pom = fs.readFileSync(resolvePomPath(context), 'utf8');
  } catch (err) {
    debug(`Not pinning maven-dependency-plugin: cannot read POM (${err})`);
    return false;
  }

  const trimmed = pom.trim();
  if (!PROJECT_OPEN.test(trimmed) || !PROJECT_CLOSE.test(trimmed)) {
    debug('Not pinning maven-dependency-plugin: POM looks malformed');
    return false;
  }
  if (DEPENDENCY_PLUGIN_MENTION.test(trimmed)) {
    debug('Not pinning maven-dependency-plugin: POM mentions the plugin');
    return false;
  }
  if (PARENT_ELEMENT.test(trimmed)) {
    debug('Not pinning maven-dependency-plugin: POM has an unreadable parent');
    return false;
  }
  return true;
}
