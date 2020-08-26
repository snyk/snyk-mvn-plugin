import * as path from 'path';
import { test } from 'tap';
import { getCommand } from '../../lib';
import * as os from 'os';

const SCENARIOS = [
  {
    name: "should return 'mvn' when no mvnw present in path",
    root: '.',
    targetFilePath: path.join(
      __dirname,
      '..',
      'fixtures/path with spaces',
      'pom.xml',
    ),
    expectedWinCommand: 'mvn',
    expectedLinCommand: 'mvn',
    expectedLocation: undefined,
  },
  {
    name: "should return 'mvnw' when 'mvnw' present in path",
    root: '.',
    targetFilePath: path.join(
      __dirname,
      '..',
      'fixtures/maven-with-mvnw',
      'pom.xml',
    ),
    expectedWinCommand: 'mvnw.cmd',
    expectedLinCommand: './mvnw',
    expectedLocation: path.join(__dirname, '..', 'fixtures/maven-with-mvnw'),
  },
  {
    name: 'no targetFile returns `mvn`',
    root: path.join(__dirname, '..', 'fixtures/path with spaces'),
    targetFilePath: undefined,
    expectedWinCommand: 'mvn',
    expectedLinCommand: 'mvn',
    expectedLocation: undefined,
  },
  {
    name: 'targetFile in root and no mvnw present in path returns `mvn`',
    root: path.join(__dirname, '..', 'fixtures/path with spaces'),
    targetFilePath: path.join(
      __dirname,
      '..',
      'fixtures/path with spaces',
      'pom.xml',
    ),
    expectedWinCommand: 'mvn',
    expectedLinCommand: 'mvn',
    expectedLocation: undefined,
  },
  {
    name: 'targetFile in sub and mvnw present in root returns `./mvnw`',
    root: path.join(__dirname, '..', 'fixtures/maven-with-mvnw-sub'),
    targetFilePath: path.join('sub', 'pom.xml'),
    expectedWinCommand: path.join('.', 'mvnw.cmd'),
    expectedLinCommand: './mvnw',
    expectedLocation: path.join(
      __dirname,
      '..',
      'fixtures/maven-with-mvnw-sub',
    ),
  },
  {
    name: 'targetFile in sub/sub2 and mvnw present in root returns `./mvnw`',
    root: path.join(__dirname, '..', 'fixtures/maven-with-mvnw-sub'),
    targetFilePath: path.join('sub/sub2', 'pom.xml'),
    expectedWinCommand: path.join('.', 'mvnw.cmd'),
    expectedLinCommand: './mvnw',
    expectedLocation: path.join(
      __dirname,
      '..',
      'fixtures/maven-with-mvnw-sub',
    ),
  },
  {
    name: 'targetFile in root and mvnw present in root returns `./mvnw`',
    root: path.join(__dirname, '..', 'fixtures/maven-with-mvnw'),
    targetFilePath: 'pom.xml',
    expectedWinCommand: 'mvnw.cmd',
    expectedLinCommand: './mvnw',
    expectedLocation: path.join(__dirname, '..', 'fixtures/maven-with-mvnw'),
  },
];

for (const scenario of SCENARIOS) {
  test(scenario.name, async (t) => {
    const cmd = getCommand(scenario.root, scenario.targetFilePath);

    const isWinLocal = /^win/.test(os.platform());

    if (isWinLocal) {
      t.equals(
        cmd.command,
        scenario.expectedWinCommand,
        `should return ${scenario.expectedWinCommand}`,
      );
    } else {
      t.equals(
        cmd.command,
        scenario.expectedLinCommand,
        `should return ${scenario.expectedLinCommand}`,
      );
    }

    t.equals(
      cmd.location,
      scenario.expectedLocation,
      'returns correct path to command',
    );
  });
}
