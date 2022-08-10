import { test } from 'tap';
import { MavenGraphBuilder } from '../../../lib/parse/maven-graph-builder';

test('default constructor', async (t) => {
  const builder = new MavenGraphBuilder('root');
  t.same(
    builder.graph,
    {
      rootId: 'root',
      nodes: {
        root: {
          dependsOn: [],
        },
      },
    },
    'builds empty graph',
  );
});

test('connect nodes', async (t) => {
  const builder = new MavenGraphBuilder('root');
  builder.connect('root', 'a');
  builder.connect('a', 'b');
  t.same(
    builder.graph,
    {
      rootId: 'root',
      nodes: {
        root: {
          dependsOn: ['a'],
        },
        a: {
          dependsOn: ['b'],
        },
        b: {
          dependsOn: [],
        },
      },
    },
    'builds connected graph',
  );
});

test('skips duplicate connections', async (t) => {
  const builder = new MavenGraphBuilder('root');
  builder.connect('root', 'a');
  builder.connect('root', 'a');
  builder.connect('root', 'a');
  t.same(
    builder.graph,
    {
      rootId: 'root',
      nodes: {
        root: {
          dependsOn: ['a'],
        },
        a: {
          dependsOn: [],
        },
      },
    },
    'builds expected graph',
  );
});
