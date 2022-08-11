import * as fs from 'fs';
import * as path from 'path';

const fixtures = path.join(__dirname, '..', 'fixtures');

/**
 * Asynchronous fs.readFile.
 */
export async function readFile(path): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}

/**
 * Read file and return contents parsed to JSON object.
 *
 * @param filePath path to file
 */
export async function readJSON(filePath: string) {
  try {
    const contents = await readFile(filePath);
    return JSON.parse(contents);
  } catch (err) {
    throw new Error(`Could not parse json file ${filePath}. ${err}`);
  }
}

/**
 * Read test fixture file.
 *
 * @param fixturePath path relative to test fixtures directory.
 */
export async function readFixture(...paths: string[]) {
  const filePath = path.join(fixtures, ...paths);
  return await readFile(filePath);
}

/**
 * Read test fixture file and parse to JSON.
 *
 * @param fixturePath path relative to test fixtures directory.
 */
export async function readFixtureJSON(...paths: string[]) {
  const filePath = path.join(fixtures, ...paths);
  return await readJSON(filePath);
}
