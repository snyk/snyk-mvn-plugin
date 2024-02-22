
import { parseMavenDependencyTree } from '../../lib/parse-tree';
import { buildDepGraphFromParsedTree } from '../../lib/depgraph-from-parsetree';
import { ParsedNode } from '../../lib/interfaces';
import { createFromJSON } from '@snyk/dep-graph';
import { expectedDepGraph } from './expected-fixtures';

it('give it a try', () => {

    const mvnVerboseOutput = `+- axis:axis:jar:1.4:compile
|  +- org.apache.axis:axis-jaxrpc:jar:1.4:compile
|  +- org.apache.axis:axis-saaj:jar:1.4:compile
|  +- axis:axis-wsdl4j:jar:1.5.1:runtime
|  +- commons-logging:commons-logging:jar:1.0.4:runtime
|  \- commons-discovery:commons-discovery:jar:0.2:runtime
|     \- (commons-logging:commons-logging:jar:1.0.3:runtime - omitted for conflict with 1.0.4)`;

    const result: ParsedNode = parseMavenDependencyTree(mvnVerboseOutput) as ParsedNode;
    const depGraph = buildDepGraphFromParsedTree(result);
    const expected = createFromJSON(expectedDepGraph);
    expect(depGraph.equals(expected)).toBeTruthy();
});


