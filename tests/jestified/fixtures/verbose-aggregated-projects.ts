import { DepGraphData } from '@snyk/dep-graph';

const aggregateProjectDepGraph: DepGraphData = {
  schemaVersion: '1.2.0',
  pkgManager: {
    name: 'maven',
  },
  pkgs: [
    {
      id: 'io.snyk:aggregate-project@1.0.0',
      info: {
        name: 'io.snyk:aggregate-project',
        version: '1.0.0',
      },
    },
  ],
  graph: {
    rootNodeId: 'root-node',
    nodes: [
      {
        nodeId: 'root-node',
        pkgId: 'io.snyk:aggregate-project@1.0.0',
        deps: [],
      },
    ],
  },
};

const coreProjectDepGraph: DepGraphData = {
  schemaVersion: '1.2.0',
  pkgManager: {
    name: 'maven',
  },
  pkgs: [
    {
      id: 'io.snyk:core@1.0.0',
      info: {
        name: 'io.snyk:core',
        version: '1.0.0',
      },
    },
    {
      id: 'org.apache.logging.log4j:log4j-api@2.17.2',
      info: {
        name: 'org.apache.logging.log4j:log4j-api',
        version: '2.17.2',
      },
    },
    {
      id: 'org.apache.logging.log4j:log4j-core@2.17.2',
      info: {
        name: 'org.apache.logging.log4j:log4j-core',
        version: '2.17.2',
      },
    },
  ],
  graph: {
    rootNodeId: 'root-node',
    nodes: [
      {
        nodeId: 'root-node',
        pkgId: 'io.snyk:core@1.0.0',
        deps: [
          {
            nodeId: 'org.apache.logging.log4j:log4j-api:2.17.2',
          },
          {
            nodeId: 'org.apache.logging.log4j:log4j-core:2.17.2',
          },
        ],
      },
      {
        nodeId: 'org.apache.logging.log4j:log4j-api:2.17.2',
        pkgId: 'org.apache.logging.log4j:log4j-api@2.17.2',
        deps: [],
      },
      {
        nodeId: 'org.apache.logging.log4j:log4j-core:2.17.2',
        pkgId: 'org.apache.logging.log4j:log4j-core@2.17.2',
        deps: [
          {
            nodeId: 'org.apache.logging.log4j:log4j-api:2.17.2',
          },
        ],
      },
    ],
  },
};

const webProjectDepGraph: DepGraphData = {
  schemaVersion: '1.2.0',
  pkgManager: {
    name: 'maven',
  },
  pkgs: [
    {
      id: 'io.snyk:web@1.0.0',
      info: {
        name: 'io.snyk:web',
        version: '1.0.0',
      },
    },
    {
      id: 'org.springframework:spring-web@5.3.21',
      info: {
        name: 'org.springframework:spring-web',
        version: '5.3.21',
      },
    },
    {
      id: 'org.springframework:spring-beans@5.3.21',
      info: {
        name: 'org.springframework:spring-beans',
        version: '5.3.21',
      },
    },
    {
      id: 'org.springframework:spring-core@5.3.21',
      info: {
        name: 'org.springframework:spring-core',
        version: '5.3.21',
      },
    },
    {
      id: 'org.springframework:spring-jcl@5.3.21',
      info: {
        name: 'org.springframework:spring-jcl',
        version: '5.3.21',
      },
    },
    {
      id: 'org.junit.jupiter:junit-jupiter-engine@5.8.1',
      info: {
        name: 'org.junit.jupiter:junit-jupiter-engine',
        version: '5.8.1',
      },
    },
    {
      id: 'org.junit.platform:junit-platform-engine@1.8.1',
      info: {
        name: 'org.junit.platform:junit-platform-engine',
        version: '1.8.1',
      },
    },
    {
      id: 'org.opentest4j:opentest4j@1.2.0',
      info: {
        name: 'org.opentest4j:opentest4j',
        version: '1.2.0',
      },
    },
    {
      id: 'org.junit.platform:junit-platform-commons@1.8.1',
      info: {
        name: 'org.junit.platform:junit-platform-commons',
        version: '1.8.1',
      },
    },
    {
      id: 'org.apiguardian:apiguardian-api@1.1.2',
      info: {
        name: 'org.apiguardian:apiguardian-api',
        version: '1.1.2',
      },
    },
    {
      id: 'org.junit.jupiter:junit-jupiter-api@5.8.1',
      info: {
        name: 'org.junit.jupiter:junit-jupiter-api',
        version: '5.8.1',
      },
    },
  ],
  graph: {
    rootNodeId: 'root-node',
    nodes: [
      {
        nodeId: 'root-node',
        pkgId: 'io.snyk:web@1.0.0',
        deps: [
          {
            nodeId: 'org.springframework:spring-web:5.3.21',
          },
        ],
      },
      {
        nodeId: 'org.springframework:spring-web:5.3.21',
        pkgId: 'org.springframework:spring-web@5.3.21',
        deps: [
          {
            nodeId: 'org.springframework:spring-beans:5.3.21',
          },
        ],
      },
      {
        nodeId: 'org.springframework:spring-beans:5.3.21',
        pkgId: 'org.springframework:spring-beans@5.3.21',
        deps: [
          {
            nodeId: 'org.springframework:spring-core:5.3.21',
          },
        ],
      },
      {
        nodeId: 'org.springframework:spring-core:5.3.21',
        pkgId: 'org.springframework:spring-core@5.3.21',
        deps: [
          {
            nodeId: 'org.springframework:spring-jcl:5.3.21',
          },
          {
            nodeId: 'org.junit.jupiter:junit-jupiter-engine:5.8.1',
          },
        ],
      },
      {
        nodeId: 'org.springframework:spring-jcl:5.3.21',
        pkgId: 'org.springframework:spring-jcl@5.3.21',
        deps: [],
      },
      {
        nodeId: 'org.junit.jupiter:junit-jupiter-engine:5.8.1',
        pkgId: 'org.junit.jupiter:junit-jupiter-engine@5.8.1',
        deps: [
          {
            nodeId: 'org.junit.platform:junit-platform-engine:1.8.1',
          },
        ],
      },
      {
        nodeId: 'org.junit.platform:junit-platform-engine:1.8.1',
        pkgId: 'org.junit.platform:junit-platform-engine@1.8.1',
        deps: [
          {
            nodeId: 'org.opentest4j:opentest4j:1.2.0',
          },
          {
            nodeId: 'org.junit.platform:junit-platform-commons:1.8.1',
          },
        ],
      },
      {
        nodeId: 'org.opentest4j:opentest4j:1.2.0',
        pkgId: 'org.opentest4j:opentest4j@1.2.0',
        deps: [],
      },
      {
        nodeId: 'org.junit.platform:junit-platform-commons:1.8.1',
        pkgId: 'org.junit.platform:junit-platform-commons@1.8.1',
        deps: [
          {
            nodeId: 'org.apiguardian:apiguardian-api:1.1.2',
          },
          {
            nodeId: 'org.junit.jupiter:junit-jupiter-api:5.8.1',
          },
        ],
      },
      {
        nodeId: 'org.apiguardian:apiguardian-api:1.1.2',
        pkgId: 'org.apiguardian:apiguardian-api@1.1.2',
        deps: [],
      },
      {
        nodeId: 'org.junit.jupiter:junit-jupiter-api:5.8.1',
        pkgId: 'org.junit.jupiter:junit-jupiter-api@5.8.1',
        deps: [
          {
            nodeId: 'org.opentest4j:opentest4j:1.2.0',
          },
          {
            nodeId: 'org.junit.platform:junit-platform-commons:1.8.1',
          },
          {
            nodeId: 'org.apiguardian:apiguardian-api:1.1.2',
          },
        ],
      },
    ],
  },
};

export const verboseAggregatedProjects: { [key: string]: DepGraphData } = {
  'io.snyk:aggregate-project': aggregateProjectDepGraph,
  'io.snyk:core': coreProjectDepGraph,
  'io.snyk:web': webProjectDepGraph,
};
