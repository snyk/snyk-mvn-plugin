import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

type Command = 'mvn' | './mvnw' | 'mvnw.cmd';

const WRAPPERS = ['mvnw', 'mvnw.cmd'];

export interface MavenContext {
  command: string;
  workingDirectory: string;
  root: string;
  targetFile?: string;
  targetPath: string;
}

export function getCommand(root: string, targetFile?: string): Command {
  if (!targetFile) {
    return 'mvn';
  }
  const isWinLocal = /^win/.test(os.platform()); // local check, can be stubbed in tests
  const wrapperScript = isWinLocal ? 'mvnw.cmd' : './mvnw';
  // try to find a sibling wrapper script first
  let pathToWrapper = path.resolve(
    root,
    path.dirname(targetFile),
    wrapperScript,
  );
  if (fs.existsSync(pathToWrapper)) {
    return wrapperScript;
  }
  // now try to find a wrapper in the root
  pathToWrapper = path.resolve(root, wrapperScript);
  if (fs.existsSync(pathToWrapper)) {
    return wrapperScript;
  }
  return 'mvn';
}

// When we have `mvn`, we can run the subProcess from anywhere.
// However due to https://github.com/takari/maven-wrapper/issues/133, `mvnw` can only be run
// within the directory where `mvnw` exists
function findWrapper(
  mavenCommand: Command,
  root: string,
  targetPath: string,
): string {
  if (mavenCommand === 'mvn') {
    return root;
  }

  // In this branch we need to -find- the mvnw location;
  // we start from the containing directory and climb up to the scanned-root-folder
  let foundMVWLocation = false;

  // Look for mvnw in the current directory. if not - climb one up
  let currentFolder = targetPath;
  do {
    if (path.dirname(root) === currentFolder || !currentFolder.length) {
      // if we climbed up the tree 1 level higher than our root directory
      throw new Error("Couldn't find mvnw");
    }

    foundMVWLocation = !!WRAPPERS.map((name) => path.join(currentFolder, name)) // paths
      .map(fs.existsSync) // since we're on the client's machine - check if the file exists
      .filter(Boolean).length; // hope for truths & booleanify
    if (!foundMVWLocation) {
      // if we couldn't find the file, go to the parent, or empty string for quick escape if needed
      currentFolder = path.dirname(currentFolder);
    }
  } while (!foundMVWLocation);

  return currentFolder;
}

export function createMavenContext(
  root: string,
  targetFile?: string,
): MavenContext {
  const targetPath = targetFile
    ? path.resolve(root, targetFile)
    : path.resolve(root);

  const command = getCommand(root, targetFile);
  const workingDirectory = findWrapper(command, root, targetPath);

  return {
    command,
    workingDirectory,
    root,
    targetFile,
    targetPath,
  };
}
