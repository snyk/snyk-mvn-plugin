import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { findArchives, isArchive } from '../../../lib/archive';

test('isArchive', async () => {
  [
    'mvn-app-1.0-SNAPSHOT.jar',
    'mvn-app-1.0-SNAPSHOT.war',
    'mvn-app-1.0-SNAPSHOT.zip',
    'path/to/mvn-app-1.0-SNAPSHOT.jar',
    'path/to/mvn-app-1.0-SNAPSHOT.war',
    'path/to/mvn-app-1.0-SNAPSHOT.zip',
  ].forEach((i) => expect(isArchive(i)).toBeTruthy());

  [
    'mvn-app-1.0-SNAPSHOTjar',
    'mvn-app-1.0-SNAPSHOT.txt',
    'mvn-app-1.0-SNAPSHOT.jzip',
    'path/to/jar/mvn-app-1.0-SNAPSHOTjar',
    'path/to/war/mvn-app-1.0-SNAPSHOTwar',
    'path/to/zip/mvn-app-1.0-SNAPSHOTzip',
  ].forEach((i) => expect(isArchive(i)).toBeFalsy());
});

const fixturesPath = path.join(__dirname, '../..', 'fixtures');
const springCorePath = path.join(fixturesPath, 'spring-core');
const badPath = path.join(fixturesPath, 'bad');
const dummyPath = path.join(fixturesPath, 'dummy');
const nestedJarsPath = path.join(fixturesPath, 'nested-jars');
const nestedWarsAarsPath = path.join(fixturesPath, 'nested-wars-aars');

test('findArchives', async () => {
  [
    { dir: springCorePath, expectedNumOfJars: 1 },
    { dir: badPath, expectedNumOfJars: 2 },
    { dir: fixturesPath, expectedNumOfJars: 14 },
    { dir: dummyPath, expectedNumOfJars: 0 },
    { dir: nestedJarsPath, expectedNumOfJars: 2 },
    { dir: nestedWarsAarsPath, expectedNumOfJars: 2 },
  ].forEach(({ dir, expectedNumOfJars }) =>
    expect(findArchives(dir).length).toEqual(expectedNumOfJars),
  );
});

describe('findArchives in a project tree', () => {
  let tmp: string;
  let root: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snyk-mvn-find-archives-'));
    root = path.join(tmp, 'app [v1] (copy)');
    [
      ['top.jar'],
      ['web', 'site.war'],
      ['android', 'lib', 'library.aar'],
      ['dist', 'deep', 'er', 'bundle.zip'],
      ['notes.txt'],
      ['web', 'site.war.bak'],
      ['web', 'SITE.JAR'],
      ['.hidden.jar'],
      ['.mvn', 'wrapper', 'maven-wrapper.jar'],
      ['dist', '.cache', 'cached.zip'],
    ].forEach((segments) => {
      fs.mkdirSync(path.join(root, ...segments.slice(0, -1)), {
        recursive: true,
      });
      fs.writeFileSync(path.join(root, ...segments), '');
    });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  const expected = () =>
    [
      ['android', 'lib', 'library.aar'],
      ['dist', 'deep', 'er', 'bundle.zip'],
      ['top.jar'],
      ['web', 'site.war'],
    ].map((segments) => path.join(root, ...segments));

  test('returns every visible jar, war, aar and zip at any depth, sorted', () => {
    expect(findArchives(root)).toEqual(expected());
  });

  test('searches the containing directory when given a file', () => {
    expect(findArchives(path.join(root, 'notes.txt'))).toEqual(expected());
  });
});

const posixOnly = process.platform === 'win32' ? describe.skip : describe;

// Skipped on Windows: creating symlinks there needs Developer Mode or admin rights.
posixOnly('findArchives with symlinks', () => {
  let tmp: string;
  let project: string;
  let outside: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snyk-mvn-symlinks-'));
    project = path.join(tmp, 'project');
    outside = path.join(tmp, 'outside');
    fs.mkdirSync(path.join(outside, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(outside, 'outside.jar'), '');
    fs.writeFileSync(path.join(outside, 'sub', 'deeper.jar'), '');
    fs.mkdirSync(path.join(project, 'libs'), { recursive: true });
    fs.writeFileSync(path.join(project, 'libs', 'inside.jar'), '');
    fs.symlinkSync(outside, path.join(project, 'libs', 'linked-dir'), 'dir');
    fs.symlinkSync(
      path.join(outside, 'outside.jar'),
      path.join(project, 'libs', 'linked.jar'),
      'file',
    );
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('lists archives directly inside a symlinked directory without recursing through it', () => {
    expect(findArchives(project)).toEqual(
      [
        ['libs', 'inside.jar'],
        ['libs', 'linked-dir', 'outside.jar'],
        ['libs', 'linked.jar'],
      ].map((segments) => path.join(project, ...segments)),
    );
  });

  test('skips symlink loops and still returns the other archives', () => {
    const libs = path.join(project, 'libs');
    fs.symlinkSync(path.join(libs, 'self'), path.join(libs, 'self'));
    fs.symlinkSync(path.join(libs, 'ping'), path.join(libs, 'pong'));
    fs.symlinkSync(path.join(libs, 'pong'), path.join(libs, 'ping'));

    expect(findArchives(project)).toEqual(
      [
        ['libs', 'inside.jar'],
        ['libs', 'linked-dir', 'outside.jar'],
        ['libs', 'linked.jar'],
      ].map((segments) => path.join(project, ...segments)),
    );
  });
});

const posixNonRoot =
  process.platform === 'win32' || process.getuid?.() === 0
    ? describe.skip
    : describe;

// Skipped on Windows (chmod does not remove read access) and as root (root can read anything).
posixNonRoot('findArchives with an unreadable directory', () => {
  let tmp: string;
  let locked: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'snyk-mvn-unreadable-'));
    locked = path.join(tmp, 'locked');
    fs.mkdirSync(path.join(tmp, 'libs'), { recursive: true });
    fs.mkdirSync(locked);
    fs.writeFileSync(path.join(tmp, 'libs', 'readable.jar'), '');
    fs.writeFileSync(path.join(locked, 'hidden-from-us.jar'), '');
    fs.chmodSync(locked, 0o000);
  });

  afterEach(() => {
    fs.chmodSync(locked, 0o700);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('fails when a subdirectory cannot be read', () => {
    expect(() => findArchives(tmp)).toThrow(
      expect.objectContaining({ code: 'EACCES' }),
    );
  });
});
