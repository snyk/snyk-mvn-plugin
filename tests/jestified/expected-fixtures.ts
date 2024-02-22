import { DepGraphData } from '@snyk/dep-graph';
import { ParsedNode } from '../../lib/interfaces';

export const expectedParsedNode: ParsedNode = {
    dependency: {
        groupId: 'axis',
        artifactId: 'axis',
        version: '1.4',
        scope: 'compile',
    },
    children: [
        {
            dependency: {
                groupId: 'org.apache.axis',
                artifactId: 'axis-jaxrpc',
                version: '1.4',
                scope: 'compile',
            },
            children: [],
        },
        {
            dependency: {
                groupId: 'org.apache.axis',
                artifactId: 'axis-saaj',
                version: '1.4',
                scope: 'compile',
            },
            children: [],
        },
        {
            dependency: {
                groupId: 'axis',
                artifactId: 'axis-wsdl4j',
                version: '1.5.1',
                scope: 'runtime',
            },
            children: [],
        },
        {
            dependency: {
                groupId: 'commons-logging',
                artifactId: 'commons-logging',
                version: '1.0.4',
                scope: 'runtime',
            },
            children: [],
        },
        {
            dependency: {
                groupId: 'commons-discovery',
                artifactId: 'commons-discovery',
                version: '0.2',
                scope: 'runtime',
            },
            children: [
                {
                    dependency: {
                        groupId: 'commons-logging',
                        artifactId: 'commons-logging',
                        version: '1.0.3',
                        scope: 'runtime',
                    },
                    children: [],
                },
            ],
        },
    ],
};

export const expectedDepGraph: DepGraphData = {
    schemaVersion: '1.2.0',
    pkgManager: { name: 'maven' },
    pkgs: [
        { id: 'axis:axis@1.4', info: { name: 'axis:axis', version: '1.4' } },
        {
            id: 'org.apache.axis:axis-jaxrpc@1.4',
            info: { name: 'org.apache.axis:axis-jaxrpc', version: '1.4' },
        },
        {
            id: 'org.apache.axis:axis-saaj@1.4',
            info: { name: 'org.apache.axis:axis-saaj', version: '1.4' },
        },
        {
            id: 'axis:axis-wsdl4j@1.5.1',
            info: { name: 'axis:axis-wsdl4j', version: '1.5.1' },
        },
        {
            id: 'commons-logging:commons-logging@1.0.4',
            info: { name: 'commons-logging:commons-logging', version: '1.0.4' },
        },
        {
            id: 'commons-discovery:commons-discovery@0.2',
            info: { name: 'commons-discovery:commons-discovery', version: '0.2' },
        },
        {
            id: 'commons-logging:commons-logging@1.0.3',
            info: { name: 'commons-logging:commons-logging', version: '1.0.3' },
        },
    ],
    graph: {
        rootNodeId: 'root-node',
        nodes: [
            { nodeId: 'root-node', pkgId: 'axis:axis@1.4', deps: [] },
            {
                nodeId: 'axis:axis:1.4',
                pkgId: 'axis:axis@1.4',
                deps: [
                    { nodeId: 'org.apache.axis:axis-jaxrpc:1.4' },
                    { nodeId: 'org.apache.axis:axis-saaj:1.4' },
                    { nodeId: 'axis:axis-wsdl4j:1.5.1' },
                    { nodeId: 'commons-logging:commons-logging:1.0.4' },
                    { nodeId: 'commons-discovery:commons-discovery:0.2' },
                ],
            },
            {
                nodeId: 'org.apache.axis:axis-jaxrpc:1.4',
                pkgId: 'org.apache.axis:axis-jaxrpc@1.4',
                deps: [],
            },
            {
                nodeId: 'org.apache.axis:axis-saaj:1.4',
                pkgId: 'org.apache.axis:axis-saaj@1.4',
                deps: [],
            },
            {
                nodeId: 'axis:axis-wsdl4j:1.5.1',
                pkgId: 'axis:axis-wsdl4j@1.5.1',
                deps: [],
            },
            {
                nodeId: 'commons-logging:commons-logging:1.0.4',
                pkgId: 'commons-logging:commons-logging@1.0.4',
                deps: [],
            },
            {
                nodeId: 'commons-discovery:commons-discovery:0.2',
                pkgId: 'commons-discovery:commons-discovery@0.2',
                deps: [{ nodeId: 'commons-logging:commons-logging:1.0.3' }],
            },
            {
                nodeId: 'commons-logging:commons-logging:1.0.3',
                pkgId: 'commons-logging:commons-logging@1.0.3',
                deps: [],
            },
        ],
    },
};
