import { DepGraphBuilder, DepGraph } from '@snyk/dep-graph';
import { ParsedNode } from './interfaces';

export function buildDepGraphFromParsedTree(parsedTree: ParsedNode): DepGraph {
    const builder = new DepGraphBuilder(
        { name: 'maven' },
        {
            name: `${parsedTree.dependency.groupId}:${parsedTree.dependency.artifactId}`,
            version: parsedTree.dependency.version,
        },
    );

    const addDependenciesRecursively = (node: ParsedNode, parentId: string) => {
        const nodeId = `${node.dependency.groupId}:${node.dependency.artifactId}:${node.dependency.version}`;
        builder.addPkgNode(
            {
                name: `${node.dependency.groupId}:${node.dependency.artifactId}`,
                version: node.dependency.version,
            },
            nodeId,
        );
        if (parentId) {
            builder.connectDep(parentId, nodeId);
        }

        node.children.forEach((child) => addDependenciesRecursively(child, nodeId));
    };

    addDependenciesRecursively(parsedTree, '');

    return builder.build();
}
