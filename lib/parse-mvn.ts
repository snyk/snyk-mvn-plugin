import { legacyCommon } from '@snyk/cli-interface';
import * as os from 'os';

const newline = /[\r\n]+/g;
const logLabel = /^\[\w+\]\s*/gm;
const digraph = /digraph([\s\S]*?)\}/g;
const errorLabel = /^\[ERROR\]/gm;

// Parse the output from 'mvn dependency:tree -DoutputType=dot'
export function parseTree(text: string, withDev) {
  // check for errors in mvn output
  if (errorLabel.test(text)) {
    throw new Error('Failed to execute an `mvn` command.');
  }

  // clear all labels
  text = text.replace(logLabel, '');

  // extract deps
  const data = getRootProject(text, withDev);

  return { ok: true, data };
}

export function parseVersions(
  text: string,
): { javaVersion: string; mavenVersion: string } {
  // AppVeyor (at least) doesn't use \n\r, therefore os.EOL doesn't work
  const data = text.split('\n');
  const mavenVersion = data[0];
  const javaVersion =
    data.find((line) => line.startsWith('Java version:')) || '';

  return { javaVersion, mavenVersion };
}

function getRootProject(text, withDev) {
  const projects = text.match(digraph);
  if (!projects) {
    throw new Error('Cannot find dependency information.');
  }
  const rootProject = getProject(projects[0], withDev);
  const defaultRoot: legacyCommon.DepTree = {
    name: 'no-name',
    version: '0.0.0',
    dependencies: {},
    packageFormatVersion: 'mvn:0.0.1',
  };

  const root = {
    ...defaultRoot,
    ...rootProject,
  };

  // Add any subsequent projects to the root as dependencies
  for (let i = 1; i < projects.length; i++) {
    const project: legacyCommon.DepTree | null = getProject(
      projects[i],
      withDev,
    );
    if (project && project.name) {
      root.dependencies = {};
      root.dependencies[project.name] = project;
    }
  }
  return root;
}

function getProject(projectDump, withDev) {
  const lines = projectDump.split(newline);
  const identity = dequote(lines[0]);
  const deps = {};
  for (let i = 1; i < lines.length - 1; i++) {
    const line = lines[i];
    const nodes = line.trim().split('->');
    const source = dequote(nodes[0]);
    const target = dequote(nodes[1]);
    deps[source] = deps[source] || [];
    deps[source].push(target);
  }
  return assemblePackage(identity, deps, withDev);
}

function assemblePackage(
  source,
  projectDeps,
  withDev,
): legacyCommon.DepTree | null {
  const sourcePackage: legacyCommon.DepTree = createPackage(source);
  if (
    sourcePackage.labels &&
    sourcePackage.labels.scope === 'test' &&
    !withDev
  ) {
    // skip a test dependency if it's not asked for
    return null;
  }
  const sourceDeps = projectDeps[source];
  if (sourceDeps) {
    sourcePackage.dependencies = {};
    for (const dep of sourceDeps) {
      const pkg: legacyCommon.DepTree | null = assemblePackage(
        dep,
        projectDeps,
        withDev,
      );
      if (pkg && pkg.name) {
        sourcePackage.dependencies[pkg.name] = pkg;
      }
    }
  }
  return sourcePackage;
}

function createPackage(pkgStr) {
  const range = getConstraint(pkgStr);

  if (range) {
    pkgStr = pkgStr.substring(0, pkgStr.indexOf(' '));
  }

  const parts = pkgStr.split(':');
  const result: legacyCommon.DepTree = {
    version: parts[3],
    name: parts[0] + ':' + parts[1],
    dependencies: {},
  };

  if (parts.length >= 5) {
    result.labels = {
      scope: parts[parts.length - 1],
    };
    result.version = parts[parts.length - 2];
  }

  return result;
}

function dequote(str) {
  return str.slice(str.indexOf('"') + 1, str.lastIndexOf('"'));
}

function getConstraint(str) {
  const index = str.indexOf('selected from constraint');
  if (index === -1) {
    return null;
  }
  return str.slice(index + 25, str.lastIndexOf(')'));
}
