import { MavenGraphBuilder } from '../../../lib/parse/maven-graph-builder';

describe('MavenGraphBuilder', () => {
  test('should create empty graph with default constructor', async () => {
    const builder = new MavenGraphBuilder('root');
    expect(builder.graph).toEqual({
      rootId: 'root',
      nodes: {
        root: {
          dependsOn: [],
          parents: [],
          reachesProdDep: false,
        },
      },
    });
  });

  test('should connect nodes correctly', async () => {
    const builder = new MavenGraphBuilder('root');
    builder.connect('root', 'a');
    builder.connect('a', 'b');
    expect(builder.graph).toEqual({
      rootId: 'root',
      nodes: {
        root: {
          dependsOn: ['a'],
          parents: [],
          reachesProdDep: true,
        },
        a: {
          dependsOn: ['b'],
          parents: ['root'],
          reachesProdDep: true,
        },
        b: {
          dependsOn: [],
          parents: ['a'],
          reachesProdDep: true,
        },
      },
    });
  });

  test('should skip duplicate connections', async () => {
    const builder = new MavenGraphBuilder('root');
    builder.connect('root', 'a');
    builder.connect('root', 'a');
    builder.connect('root', 'a');
    expect(builder.graph).toEqual({
      rootId: 'root',
      nodes: {
        root: {
          dependsOn: ['a'],
          parents: [],
          reachesProdDep: true,
        },
        a: {
          dependsOn: [],
          parents: ['root'],
          reachesProdDep: true,
        },
      },
    });
  });
});
