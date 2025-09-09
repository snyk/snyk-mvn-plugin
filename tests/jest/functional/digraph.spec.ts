import { parseDigraphs } from '../../../lib/parse/digraph';

describe('parseDigraphs', () => {
  const core = `digraph "io.snyk:core:jar:1.0.0" {
"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ;
"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ;
}`;

  test('should parse digraph correctly', async () => {
    expect(parseDigraphs([core])).toEqual([
      {
        rootId: 'io.snyk:core:jar:1.0.0',
        nodes: {
          'io.snyk:core:jar:1.0.0': {
            dependsOn: [
              'org.apache.logging.log4j:log4j-api:jar:2.17.2:compile',
              'org.apache.logging.log4j:log4j-core:jar:2.17.2:compile',
            ],
            parents: [],
            reachesProdDep: true,
          },
          'org.apache.logging.log4j:log4j-api:jar:2.17.2:compile': {
            dependsOn: [],
            parents: ['io.snyk:core:jar:1.0.0'],
            reachesProdDep: true,
          },
          'org.apache.logging.log4j:log4j-core:jar:2.17.2:compile': {
            dependsOn: [],
            parents: ['io.snyk:core:jar:1.0.0'],
            reachesProdDep: true,
          },
        },
      },
    ]);
  });

  test('should throw error when could not find root node', async () => {
    const badRoot = `digraph bad {
      "io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ;
      "io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ;
    }`;

    expect(() => parseDigraphs([badRoot])).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(
          'Unexpected digraph could not find root node',
        ),
      }),
    );
  });

  test('should throw error when could not connect nodes', async () => {
    const badDependency = `digraph "io.snyk:core:jar:1.0.0" {
bad
}`;

    expect(() => parseDigraphs([badDependency])).toThrow(
      expect.objectContaining({
        message: expect.stringMatching(
          'Unexpected digraph could not connect nodes',
        ),
      }),
    );
  });
});
