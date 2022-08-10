import { test } from 'tap';
import { parseDigraphs } from '../../../lib/parse/digraph';

const core = `digraph "io.snyk:core:jar:1.0.0" { 
"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ; 
"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ; 
}`;

test('parses digraph', async (t) => {
  t.same(
    parseDigraphs([core]),
    [
      {
        rootId: 'io.snyk:core:jar:1.0.0',
        nodes: {
          'io.snyk:core:jar:1.0.0': {
            dependsOn: [
              'org.apache.logging.log4j:log4j-api:jar:2.17.2:compile',
              'org.apache.logging.log4j:log4j-core:jar:2.17.2:compile',
            ],
          },
          'org.apache.logging.log4j:log4j-api:jar:2.17.2:compile': {
            dependsOn: [],
          },
          'org.apache.logging.log4j:log4j-core:jar:2.17.2:compile': {
            dependsOn: [],
          },
        },
      },
    ],
    'contains expected graph',
  );
});

const badRoot = `digraph bad { 
  "io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ; 
  "io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ; 
}`;
test('could not find root node', async (t) => {
  try {
    parseDigraphs([badRoot]);
    t.fail('expected error to be thrown');
  } catch (err: unknown) {
    if (err instanceof Error) {
      t.match(
        err.message,
        'Unexpected digraph could not find root node',
        'throws expected error',
      );
    } else {
      t.fail('expected err to be instanceof Error');
    }
  }
});

const badDependency = `digraph "io.snyk:core:jar:1.0.0" { 
bad
}`;

test('could not connect nodes', async (t) => {
  try {
    parseDigraphs([badDependency]);
    t.fail('expected error to be thrown');
  } catch (err: unknown) {
    if (err instanceof Error) {
      t.match(
        err.message,
        'Unexpected digraph could not connect nodes',
        'throws expected error',
      );
    } else {
      t.fail('expected err to be instanceof Error');
    }
  }
});
