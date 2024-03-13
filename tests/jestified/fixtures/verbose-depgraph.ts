export const smallVerboseDepGraphData = {
  schemaVersion: '1.2.0',
  pkgManager: {
    name: 'maven',
  },
  pkgs: [
    {
      id: 'io.snyk.example:test-project@1.0-SNAPSHOT',
      info: {
        name: 'io.snyk.example:test-project',
        version: '1.0-SNAPSHOT',
      },
    },
    {
      id: 'axis:axis@1.4',
      info: {
        name: 'axis:axis',
        version: '1.4',
      },
    },
    {
      id: 'org.apache.axis:axis-jaxrpc@1.4',
      info: {
        name: 'org.apache.axis:axis-jaxrpc',
        version: '1.4',
      },
    },
    {
      id: 'org.apache.axis:axis-saaj@1.4',
      info: {
        name: 'org.apache.axis:axis-saaj',
        version: '1.4',
      },
    },
    {
      id: 'axis:axis-wsdl4j@1.5.1',
      info: {
        name: 'axis:axis-wsdl4j',
        version: '1.5.1',
      },
    },
    {
      id: 'commons-logging:commons-logging@1.0.4',
      info: {
        name: 'commons-logging:commons-logging',
        version: '1.0.4',
      },
    },
    {
      id: 'commons-discovery:commons-discovery@0.2',
      info: {
        name: 'commons-discovery:commons-discovery',
        version: '0.2',
      },
    },
    {
      id: 'junit:junit@4.10',
      info: {
        name: 'junit:junit',
        version: '4.10',
      },
    },
    {
      id: 'org.hamcrest:hamcrest-core@1.1',
      info: {
        name: 'org.hamcrest:hamcrest-core',
        version: '1.1',
      },
    },
  ],
  graph: {
    rootNodeId: 'root-node',
    nodes: [
      {
        nodeId: 'root-node',
        pkgId: 'io.snyk.example:test-project@1.0-SNAPSHOT',
        deps: [
          {
            nodeId: 'axis:axis:1.4',
          },
        ],
      },
      {
        nodeId: 'axis:axis:1.4',
        pkgId: 'axis:axis@1.4',
        deps: [
          {
            nodeId: 'org.apache.axis:axis-jaxrpc:1.4',
          },
          {
            nodeId: 'org.apache.axis:axis-saaj:1.4',
          },
          {
            nodeId: 'axis:axis-wsdl4j:1.5.1',
          },
          {
            nodeId: 'commons-logging:commons-logging:1.0.4',
          },
          {
            nodeId: 'commons-discovery:commons-discovery:0.2',
          },
          {
            nodeId: 'junit:junit:4.10',
          },
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
        deps: [],
      },
      {
        nodeId: 'junit:junit:4.10',
        pkgId: 'junit:junit@4.10',
        deps: [
          {
            nodeId: 'org.hamcrest:hamcrest-core:1.1',
          },
        ],
      },
      {
        nodeId: 'org.hamcrest:hamcrest-core:1.1',
        pkgId: 'org.hamcrest:hamcrest-core@1.1',
        deps: [],
      },
    ],
  },
};

export const largeVerboseDepGraphData = {
  schemaVersion: '1.2.0',
  pkgManager: {
    name: 'maven',
  },
  pkgs: [
    {
      id: 'io.snyk.example:test-project@1.0-SNAPSHOT',
      info: {
        name: 'io.snyk.example:test-project',
        version: '1.0-SNAPSHOT',
      },
    },
    {
      id: 'org.springframework.boot:spring-boot-starter-test@2.7.15',
      info: {
        name: 'org.springframework.boot:spring-boot-starter-test',
        version: '2.7.15',
      },
    },
    {
      id: 'org.springframework.boot:spring-boot-starter@2.7.15',
      info: {
        name: 'org.springframework.boot:spring-boot-starter',
        version: '2.7.15',
      },
    },
    {
      id: 'org.springframework.boot:spring-boot@2.7.15',
      info: {
        name: 'org.springframework.boot:spring-boot',
        version: '2.7.15',
      },
    },
    {
      id: 'org.springframework:spring-core@5.3.29',
      info: {
        name: 'org.springframework:spring-core',
        version: '5.3.29',
      },
    },
    {
      id: 'org.springframework:spring-context@5.3.29',
      info: {
        name: 'org.springframework:spring-context',
        version: '5.3.29',
      },
    },
    {
      id: 'org.springframework:spring-aop@5.3.29',
      info: {
        name: 'org.springframework:spring-aop',
        version: '5.3.29',
      },
    },
    {
      id: 'org.springframework:spring-beans@5.3.29',
      info: {
        name: 'org.springframework:spring-beans',
        version: '5.3.29',
      },
    },
    {
      id: 'org.springframework:spring-expression@5.3.29',
      info: {
        name: 'org.springframework:spring-expression',
        version: '5.3.29',
      },
    },
    {
      id: 'org.springframework.boot:spring-boot-autoconfigure@2.7.15',
      info: {
        name: 'org.springframework.boot:spring-boot-autoconfigure',
        version: '2.7.15',
      },
    },
    {
      id: 'org.springframework.boot:spring-boot-starter-logging@2.7.15',
      info: {
        name: 'org.springframework.boot:spring-boot-starter-logging',
        version: '2.7.15',
      },
    },
    {
      id: 'ch.qos.logback:logback-classic@1.2.12',
      info: {
        name: 'ch.qos.logback:logback-classic',
        version: '1.2.12',
      },
    },
    {
      id: 'ch.qos.logback:logback-core@1.2.12',
      info: {
        name: 'ch.qos.logback:logback-core',
        version: '1.2.12',
      },
    },
    {
      id: 'org.slf4j:slf4j-api@1.7.33',
      info: {
        name: 'org.slf4j:slf4j-api',
        version: '1.7.33',
      },
    },
    {
      id: 'org.apache.logging.log4j:log4j-to-slf4j@2.17.2',
      info: {
        name: 'org.apache.logging.log4j:log4j-to-slf4j',
        version: '2.17.2',
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
      id: 'org.slf4j:jul-to-slf4j@1.7.36',
      info: {
        name: 'org.slf4j:jul-to-slf4j',
        version: '1.7.36',
      },
    },
    {
      id: 'jakarta.annotation:jakarta.annotation-api@1.3.5',
      info: {
        name: 'jakarta.annotation:jakarta.annotation-api',
        version: '1.3.5',
      },
    },
    {
      id: 'org.yaml:snakeyaml@1.33',
      info: {
        name: 'org.yaml:snakeyaml',
        version: '1.33',
      },
    },
    {
      id: 'org.springframework.boot:spring-boot-test@2.7.15',
      info: {
        name: 'org.springframework.boot:spring-boot-test',
        version: '2.7.15',
      },
    },
    {
      id: 'org.springframework.boot:spring-boot-test-autoconfigure@2.7.15',
      info: {
        name: 'org.springframework.boot:spring-boot-test-autoconfigure',
        version: '2.7.15',
      },
    },
    {
      id: 'com.jayway.jsonpath:json-path@2.7.0',
      info: {
        name: 'com.jayway.jsonpath:json-path',
        version: '2.7.0',
      },
    },
    {
      id: 'net.minidev:json-smart@2.4.7',
      info: {
        name: 'net.minidev:json-smart',
        version: '2.4.7',
      },
    },
    {
      id: 'net.minidev:accessors-smart@2.4.7',
      info: {
        name: 'net.minidev:accessors-smart',
        version: '2.4.7',
      },
    },
    {
      id: 'org.ow2.asm:asm@9.1',
      info: {
        name: 'org.ow2.asm:asm',
        version: '9.1',
      },
    },
    {
      id: 'jakarta.xml.bind:jakarta.xml.bind-api@2.3.3',
      info: {
        name: 'jakarta.xml.bind:jakarta.xml.bind-api',
        version: '2.3.3',
      },
    },
    {
      id: 'jakarta.activation:jakarta.activation-api@1.2.2',
      info: {
        name: 'jakarta.activation:jakarta.activation-api',
        version: '1.2.2',
      },
    },
    {
      id: 'org.assertj:assertj-core@3.22.0',
      info: {
        name: 'org.assertj:assertj-core',
        version: '3.22.0',
      },
    },
    {
      id: 'org.hamcrest:hamcrest@2.2',
      info: {
        name: 'org.hamcrest:hamcrest',
        version: '2.2',
      },
    },
    {
      id: 'org.junit.jupiter:junit-jupiter@5.8.2',
      info: {
        name: 'org.junit.jupiter:junit-jupiter',
        version: '5.8.2',
      },
    },
    {
      id: 'org.junit.jupiter:junit-jupiter-api@5.8.2',
      info: {
        name: 'org.junit.jupiter:junit-jupiter-api',
        version: '5.8.2',
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
      id: 'org.junit.platform:junit-platform-commons@1.8.2',
      info: {
        name: 'org.junit.platform:junit-platform-commons',
        version: '1.8.2',
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
      id: 'org.junit.jupiter:junit-jupiter-params@5.8.2',
      info: {
        name: 'org.junit.jupiter:junit-jupiter-params',
        version: '5.8.2',
      },
    },
    {
      id: 'org.junit.jupiter:junit-jupiter-engine@5.8.2',
      info: {
        name: 'org.junit.jupiter:junit-jupiter-engine',
        version: '5.8.2',
      },
    },
    {
      id: 'org.junit.platform:junit-platform-engine@1.8.2',
      info: {
        name: 'org.junit.platform:junit-platform-engine',
        version: '1.8.2',
      },
    },
    {
      id: 'org.mockito:mockito-core@4.5.1',
      info: {
        name: 'org.mockito:mockito-core',
        version: '4.5.1',
      },
    },
    {
      id: 'net.bytebuddy:byte-buddy@1.12.9',
      info: {
        name: 'net.bytebuddy:byte-buddy',
        version: '1.12.9',
      },
    },
    {
      id: 'net.bytebuddy:byte-buddy-agent@1.12.9',
      info: {
        name: 'net.bytebuddy:byte-buddy-agent',
        version: '1.12.9',
      },
    },
    {
      id: 'org.objenesis:objenesis@3.2',
      info: {
        name: 'org.objenesis:objenesis',
        version: '3.2',
      },
    },
    {
      id: 'org.mockito:mockito-junit-jupiter@4.5.1',
      info: {
        name: 'org.mockito:mockito-junit-jupiter',
        version: '4.5.1',
      },
    },
    {
      id: 'org.skyscreamer:jsonassert@1.5.1',
      info: {
        name: 'org.skyscreamer:jsonassert',
        version: '1.5.1',
      },
    },
    {
      id: 'com.vaadin.external.google:android-json@0.0.20131108.vaadin1',
      info: {
        name: 'com.vaadin.external.google:android-json',
        version: '0.0.20131108.vaadin1',
      },
    },
    {
      id: 'org.springframework:spring-jcl@5.3.29',
      info: {
        name: 'org.springframework:spring-jcl',
        version: '5.3.29',
      },
    },
    {
      id: 'org.springframework:spring-test@5.3.29',
      info: {
        name: 'org.springframework:spring-test',
        version: '5.3.29',
      },
    },
    {
      id: 'org.xmlunit:xmlunit-core@2.9.1',
      info: {
        name: 'org.xmlunit:xmlunit-core',
        version: '2.9.1',
      },
    },
    {
      id: 'com.fasterxml.jackson.dataformat:jackson-dataformat-yaml@2.14.2',
      info: {
        name: 'com.fasterxml.jackson.dataformat:jackson-dataformat-yaml',
        version: '2.14.2',
      },
    },
    {
      id: 'com.fasterxml.jackson.core:jackson-databind@2.14.2',
      info: {
        name: 'com.fasterxml.jackson.core:jackson-databind',
        version: '2.14.2',
      },
    },
    {
      id: 'com.fasterxml.jackson.core:jackson-annotations@2.14.2',
      info: {
        name: 'com.fasterxml.jackson.core:jackson-annotations',
        version: '2.14.2',
      },
    },
    {
      id: 'com.fasterxml.jackson.core:jackson-core@2.14.2',
      info: {
        name: 'com.fasterxml.jackson.core:jackson-core',
        version: '2.14.2',
      },
    },
    {
      id: 'axis:axis@1.4',
      info: {
        name: 'axis:axis',
        version: '1.4',
      },
    },
    {
      id: 'org.apache.axis:axis-jaxrpc@1.4',
      info: {
        name: 'org.apache.axis:axis-jaxrpc',
        version: '1.4',
      },
    },
    {
      id: 'org.apache.axis:axis-saaj@1.4',
      info: {
        name: 'org.apache.axis:axis-saaj',
        version: '1.4',
      },
    },
    {
      id: 'axis:axis-wsdl4j@1.5.1',
      info: {
        name: 'axis:axis-wsdl4j',
        version: '1.5.1',
      },
    },
    {
      id: 'commons-logging:commons-logging@1.0.4',
      info: {
        name: 'commons-logging:commons-logging',
        version: '1.0.4',
      },
    },
    {
      id: 'commons-discovery:commons-discovery@0.2',
      info: {
        name: 'commons-discovery:commons-discovery',
        version: '0.2',
      },
    },
    {
      id: 'junit:junit@4.10',
      info: {
        name: 'junit:junit',
        version: '4.10',
      },
    },
    {
      id: 'org.hamcrest:hamcrest-core@1.1',
      info: {
        name: 'org.hamcrest:hamcrest-core',
        version: '1.1',
      },
    },
  ],
  graph: {
    rootNodeId: 'root-node',
    nodes: [
      {
        nodeId: 'root-node',
        pkgId: 'io.snyk.example:test-project@1.0-SNAPSHOT',
        deps: [
          {
            nodeId: 'org.springframework.boot:spring-boot-starter-test:2.7.15',
          },
        ],
      },
      {
        nodeId: 'org.springframework.boot:spring-boot-starter-test:2.7.15',
        pkgId: 'org.springframework.boot:spring-boot-starter-test@2.7.15',
        deps: [
          {
            nodeId: 'org.springframework.boot:spring-boot-starter:2.7.15',
          },
        ],
      },
      {
        nodeId: 'org.springframework.boot:spring-boot-starter:2.7.15',
        pkgId: 'org.springframework.boot:spring-boot-starter@2.7.15',
        deps: [
          {
            nodeId: 'org.springframework.boot:spring-boot:2.7.15',
          },
        ],
      },
      {
        nodeId: 'org.springframework.boot:spring-boot:2.7.15',
        pkgId: 'org.springframework.boot:spring-boot@2.7.15',
        deps: [
          {
            nodeId: 'org.springframework:spring-core:5.3.29',
          },
          {
            nodeId: 'org.springframework:spring-context:5.3.29',
          },
        ],
      },
      {
        nodeId: 'org.springframework:spring-core:5.3.29',
        pkgId: 'org.springframework:spring-core@5.3.29',
        deps: [
          {
            nodeId: 'org.springframework:spring-jcl:5.3.29',
          },
          {
            nodeId: 'org.springframework:spring-test:5.3.29',
          },
        ],
      },
      {
        nodeId: 'org.springframework:spring-context:5.3.29',
        pkgId: 'org.springframework:spring-context@5.3.29',
        deps: [
          {
            nodeId: 'org.springframework:spring-aop:5.3.29',
          },
          {
            nodeId: 'org.springframework.boot:spring-boot-autoconfigure:2.7.15',
          },
        ],
      },
      {
        nodeId: 'org.springframework:spring-aop:5.3.29',
        pkgId: 'org.springframework:spring-aop@5.3.29',
        deps: [
          {
            nodeId: 'org.springframework:spring-beans:5.3.29',
          },
          {
            nodeId: 'org.springframework:spring-core:5.3.29',
          },
        ],
      },
      {
        nodeId: 'org.springframework:spring-beans:5.3.29',
        pkgId: 'org.springframework:spring-beans@5.3.29',
        deps: [
          {
            nodeId: 'org.springframework:spring-core:5.3.29',
          },
          {
            nodeId: 'org.springframework:spring-expression:5.3.29',
          },
        ],
      },
      {
        nodeId: 'org.springframework:spring-expression:5.3.29',
        pkgId: 'org.springframework:spring-expression@5.3.29',
        deps: [
          {
            nodeId: 'org.springframework:spring-core:5.3.29',
          },
        ],
      },
      {
        nodeId: 'org.springframework.boot:spring-boot-autoconfigure:2.7.15',
        pkgId: 'org.springframework.boot:spring-boot-autoconfigure@2.7.15',
        deps: [
          {
            nodeId: 'org.springframework.boot:spring-boot:2.7.15',
          },
          {
            nodeId:
              'org.springframework.boot:spring-boot-starter-logging:2.7.15',
          },
        ],
      },
      {
        nodeId: 'org.springframework.boot:spring-boot-starter-logging:2.7.15',
        pkgId: 'org.springframework.boot:spring-boot-starter-logging@2.7.15',
        deps: [
          {
            nodeId: 'ch.qos.logback:logback-classic:1.2.12',
          },
          {
            nodeId: 'org.springframework.boot:spring-boot-test:2.7.15',
          },
        ],
      },
      {
        nodeId: 'ch.qos.logback:logback-classic:1.2.12',
        pkgId: 'ch.qos.logback:logback-classic@1.2.12',
        deps: [
          {
            nodeId: 'ch.qos.logback:logback-core:1.2.12',
          },
          {
            nodeId: 'org.slf4j:slf4j-api:1.7.33',
          },
          {
            nodeId: 'org.apache.logging.log4j:log4j-to-slf4j:2.17.2',
          },
        ],
      },
      {
        nodeId: 'ch.qos.logback:logback-core:1.2.12',
        pkgId: 'ch.qos.logback:logback-core@1.2.12',
        deps: [],
      },
      {
        nodeId: 'org.slf4j:slf4j-api:1.7.33',
        pkgId: 'org.slf4j:slf4j-api@1.7.33',
        deps: [],
      },
      {
        nodeId: 'org.apache.logging.log4j:log4j-to-slf4j:2.17.2',
        pkgId: 'org.apache.logging.log4j:log4j-to-slf4j@2.17.2',
        deps: [
          {
            nodeId: 'org.slf4j:slf4j-api:1.7.33',
          },
          {
            nodeId: 'org.apache.logging.log4j:log4j-api:2.17.2',
          },
          {
            nodeId: 'org.slf4j:jul-to-slf4j:1.7.36',
          },
        ],
      },
      {
        nodeId: 'org.apache.logging.log4j:log4j-api:2.17.2',
        pkgId: 'org.apache.logging.log4j:log4j-api@2.17.2',
        deps: [],
      },
      {
        nodeId: 'org.slf4j:jul-to-slf4j:1.7.36',
        pkgId: 'org.slf4j:jul-to-slf4j@1.7.36',
        deps: [
          {
            nodeId: 'org.slf4j:slf4j-api:1.7.33',
          },
          {
            nodeId: 'jakarta.annotation:jakarta.annotation-api:1.3.5',
          },
          {
            nodeId: 'org.springframework:spring-core:5.3.29',
          },
          {
            nodeId: 'org.yaml:snakeyaml:1.33',
          },
        ],
      },
      {
        nodeId: 'jakarta.annotation:jakarta.annotation-api:1.3.5',
        pkgId: 'jakarta.annotation:jakarta.annotation-api@1.3.5',
        deps: [],
      },
      {
        nodeId: 'org.yaml:snakeyaml:1.33',
        pkgId: 'org.yaml:snakeyaml@1.33',
        deps: [],
      },
      {
        nodeId: 'org.springframework.boot:spring-boot-test:2.7.15',
        pkgId: 'org.springframework.boot:spring-boot-test@2.7.15',
        deps: [
          {
            nodeId: 'org.springframework.boot:spring-boot:2.7.15',
          },
          {
            nodeId:
              'org.springframework.boot:spring-boot-test-autoconfigure:2.7.15',
          },
        ],
      },
      {
        nodeId:
          'org.springframework.boot:spring-boot-test-autoconfigure:2.7.15',
        pkgId: 'org.springframework.boot:spring-boot-test-autoconfigure@2.7.15',
        deps: [
          {
            nodeId: 'org.springframework.boot:spring-boot:2.7.15',
          },
          {
            nodeId: 'org.springframework.boot:spring-boot-test:2.7.15',
          },
          {
            nodeId: 'org.springframework.boot:spring-boot-autoconfigure:2.7.15',
          },
          {
            nodeId: 'com.jayway.jsonpath:json-path:2.7.0',
          },
        ],
      },
      {
        nodeId: 'com.jayway.jsonpath:json-path:2.7.0',
        pkgId: 'com.jayway.jsonpath:json-path@2.7.0',
        deps: [
          {
            nodeId: 'net.minidev:json-smart:2.4.7',
          },
        ],
      },
      {
        nodeId: 'net.minidev:json-smart:2.4.7',
        pkgId: 'net.minidev:json-smart@2.4.7',
        deps: [
          {
            nodeId: 'net.minidev:accessors-smart:2.4.7',
          },
          {
            nodeId: 'jakarta.xml.bind:jakarta.xml.bind-api:2.3.3',
          },
        ],
      },
      {
        nodeId: 'net.minidev:accessors-smart:2.4.7',
        pkgId: 'net.minidev:accessors-smart@2.4.7',
        deps: [
          {
            nodeId: 'org.ow2.asm:asm:9.1',
          },
          {
            nodeId: 'org.slf4j:slf4j-api:1.7.33',
          },
        ],
      },
      {
        nodeId: 'org.ow2.asm:asm:9.1',
        pkgId: 'org.ow2.asm:asm@9.1',
        deps: [],
      },
      {
        nodeId: 'jakarta.xml.bind:jakarta.xml.bind-api:2.3.3',
        pkgId: 'jakarta.xml.bind:jakarta.xml.bind-api@2.3.3',
        deps: [
          {
            nodeId: 'jakarta.activation:jakarta.activation-api:1.2.2',
          },
          {
            nodeId: 'org.assertj:assertj-core:3.22.0',
          },
          {
            nodeId: 'org.hamcrest:hamcrest:2.2',
          },
          {
            nodeId: 'org.junit.jupiter:junit-jupiter:5.8.2',
          },
        ],
      },
      {
        nodeId: 'jakarta.activation:jakarta.activation-api:1.2.2',
        pkgId: 'jakarta.activation:jakarta.activation-api@1.2.2',
        deps: [],
      },
      {
        nodeId: 'org.assertj:assertj-core:3.22.0',
        pkgId: 'org.assertj:assertj-core@3.22.0',
        deps: [],
      },
      {
        nodeId: 'org.hamcrest:hamcrest:2.2',
        pkgId: 'org.hamcrest:hamcrest@2.2',
        deps: [],
      },
      {
        nodeId: 'org.junit.jupiter:junit-jupiter:5.8.2',
        pkgId: 'org.junit.jupiter:junit-jupiter@5.8.2',
        deps: [
          {
            nodeId: 'org.junit.jupiter:junit-jupiter-api:5.8.2',
          },
        ],
      },
      {
        nodeId: 'org.junit.jupiter:junit-jupiter-api:5.8.2',
        pkgId: 'org.junit.jupiter:junit-jupiter-api@5.8.2',
        deps: [
          {
            nodeId: 'org.opentest4j:opentest4j:1.2.0',
          },
          {
            nodeId: 'org.junit.platform:junit-platform-commons:1.8.2',
          },
          {
            nodeId: 'org.junit.jupiter:junit-jupiter-params:5.8.2',
          },
        ],
      },
      {
        nodeId: 'org.opentest4j:opentest4j:1.2.0',
        pkgId: 'org.opentest4j:opentest4j@1.2.0',
        deps: [],
      },
      {
        nodeId: 'org.junit.platform:junit-platform-commons:1.8.2',
        pkgId: 'org.junit.platform:junit-platform-commons@1.8.2',
        deps: [
          {
            nodeId: 'org.apiguardian:apiguardian-api:1.1.2',
          },
        ],
      },
      {
        nodeId: 'org.apiguardian:apiguardian-api:1.1.2',
        pkgId: 'org.apiguardian:apiguardian-api@1.1.2',
        deps: [],
      },
      {
        nodeId: 'org.junit.jupiter:junit-jupiter-params:5.8.2',
        pkgId: 'org.junit.jupiter:junit-jupiter-params@5.8.2',
        deps: [
          {
            nodeId: 'org.junit.jupiter:junit-jupiter-api:5.8.2',
          },
          {
            nodeId: 'org.apiguardian:apiguardian-api:1.1.2',
          },
          {
            nodeId: 'org.junit.jupiter:junit-jupiter-engine:5.8.2',
          },
        ],
      },
      {
        nodeId: 'org.junit.jupiter:junit-jupiter-engine:5.8.2',
        pkgId: 'org.junit.jupiter:junit-jupiter-engine@5.8.2',
        deps: [
          {
            nodeId: 'org.junit.platform:junit-platform-engine:1.8.2',
          },
          {
            nodeId: 'org.mockito:mockito-core:4.5.1',
          },
        ],
      },
      {
        nodeId: 'org.junit.platform:junit-platform-engine:1.8.2',
        pkgId: 'org.junit.platform:junit-platform-engine@1.8.2',
        deps: [
          {
            nodeId: 'org.opentest4j:opentest4j:1.2.0',
          },
          {
            nodeId: 'org.junit.platform:junit-platform-commons:1.8.2',
          },
          {
            nodeId: 'org.apiguardian:apiguardian-api:1.1.2',
          },
          {
            nodeId: 'org.junit.jupiter:junit-jupiter-api:5.8.2',
          },
        ],
      },
      {
        nodeId: 'org.mockito:mockito-core:4.5.1',
        pkgId: 'org.mockito:mockito-core@4.5.1',
        deps: [
          {
            nodeId: 'net.bytebuddy:byte-buddy:1.12.9',
          },
          {
            nodeId: 'net.bytebuddy:byte-buddy-agent:1.12.9',
          },
          {
            nodeId: 'org.objenesis:objenesis:3.2',
          },
          {
            nodeId: 'org.mockito:mockito-junit-jupiter:4.5.1',
          },
        ],
      },
      {
        nodeId: 'net.bytebuddy:byte-buddy:1.12.9',
        pkgId: 'net.bytebuddy:byte-buddy@1.12.9',
        deps: [],
      },
      {
        nodeId: 'net.bytebuddy:byte-buddy-agent:1.12.9',
        pkgId: 'net.bytebuddy:byte-buddy-agent@1.12.9',
        deps: [],
      },
      {
        nodeId: 'org.objenesis:objenesis:3.2',
        pkgId: 'org.objenesis:objenesis@3.2',
        deps: [],
      },
      {
        nodeId: 'org.mockito:mockito-junit-jupiter:4.5.1',
        pkgId: 'org.mockito:mockito-junit-jupiter@4.5.1',
        deps: [
          {
            nodeId: 'org.mockito:mockito-core:4.5.1',
          },
          {
            nodeId: 'org.junit.jupiter:junit-jupiter-api:5.8.2',
          },
          {
            nodeId: 'org.skyscreamer:jsonassert:1.5.1',
          },
        ],
      },
      {
        nodeId: 'org.skyscreamer:jsonassert:1.5.1',
        pkgId: 'org.skyscreamer:jsonassert@1.5.1',
        deps: [
          {
            nodeId:
              'com.vaadin.external.google:android-json:0.0.20131108.vaadin1',
          },
          {
            nodeId: 'org.springframework:spring-core:5.3.29',
          },
        ],
      },
      {
        nodeId: 'com.vaadin.external.google:android-json:0.0.20131108.vaadin1',
        pkgId: 'com.vaadin.external.google:android-json@0.0.20131108.vaadin1',
        deps: [],
      },
      {
        nodeId: 'org.springframework:spring-jcl:5.3.29',
        pkgId: 'org.springframework:spring-jcl@5.3.29',
        deps: [],
      },
      {
        nodeId: 'org.springframework:spring-test:5.3.29',
        pkgId: 'org.springframework:spring-test@5.3.29',
        deps: [
          {
            nodeId: 'org.springframework:spring-core:5.3.29',
          },
          {
            nodeId: 'org.xmlunit:xmlunit-core:2.9.1',
          },
        ],
      },
      {
        nodeId: 'org.xmlunit:xmlunit-core:2.9.1',
        pkgId: 'org.xmlunit:xmlunit-core@2.9.1',
        deps: [
          {
            nodeId: 'jakarta.xml.bind:jakarta.xml.bind-api:2.3.3',
          },
          {
            nodeId:
              'com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:2.14.2',
          },
        ],
      },
      {
        nodeId:
          'com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:2.14.2',
        pkgId:
          'com.fasterxml.jackson.dataformat:jackson-dataformat-yaml@2.14.2',
        deps: [
          {
            nodeId: 'com.fasterxml.jackson.core:jackson-databind:2.14.2',
          },
        ],
      },
      {
        nodeId: 'com.fasterxml.jackson.core:jackson-databind:2.14.2',
        pkgId: 'com.fasterxml.jackson.core:jackson-databind@2.14.2',
        deps: [
          {
            nodeId: 'com.fasterxml.jackson.core:jackson-annotations:2.14.2',
          },
          {
            nodeId: 'com.fasterxml.jackson.core:jackson-core:2.14.2',
          },
          {
            nodeId: 'org.yaml:snakeyaml:1.33',
          },
          {
            nodeId: 'axis:axis:1.4',
          },
        ],
      },
      {
        nodeId: 'com.fasterxml.jackson.core:jackson-annotations:2.14.2',
        pkgId: 'com.fasterxml.jackson.core:jackson-annotations@2.14.2',
        deps: [],
      },
      {
        nodeId: 'com.fasterxml.jackson.core:jackson-core:2.14.2',
        pkgId: 'com.fasterxml.jackson.core:jackson-core@2.14.2',
        deps: [],
      },
      {
        nodeId: 'axis:axis:1.4',
        pkgId: 'axis:axis@1.4',
        deps: [
          {
            nodeId: 'org.apache.axis:axis-jaxrpc:1.4',
          },
          {
            nodeId: 'org.apache.axis:axis-saaj:1.4',
          },
          {
            nodeId: 'axis:axis-wsdl4j:1.5.1',
          },
          {
            nodeId: 'commons-logging:commons-logging:1.0.4',
          },
          {
            nodeId: 'commons-discovery:commons-discovery:0.2',
          },
          {
            nodeId: 'junit:junit:4.10',
          },
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
        deps: [
          {
            nodeId: 'commons-logging:commons-logging:1.0.4',
          },
        ],
      },
      {
        nodeId: 'junit:junit:4.10',
        pkgId: 'junit:junit@4.10',
        deps: [
          {
            nodeId: 'org.hamcrest:hamcrest-core:1.1',
          },
        ],
      },
      {
        nodeId: 'org.hamcrest:hamcrest-core:1.1',
        pkgId: 'org.hamcrest:hamcrest-core@1.1',
        deps: [],
      },
    ],
  },
};

export const smallVerboseDepGraphNewMvnPlugin = {
  schemaVersion: "1.2.0",
  pkgManager: {
    name: "maven"
  },
  pkgs: [
    {
      id: "io.snyk.example:test-project@1.0-SNAPSHOT",
      info: {
        name: "io.snyk.example:test-project",
        version: "1.0-SNAPSHOT"
      }
    },
    {
      id: "axis:axis@1.4",
      info: {
        name: "axis:axis",
        version: "1.4"
      }
    },
    {
      id: "junit:junit@4.10",
      info: {
        name: "junit:junit",
        version: "4.10"
      }
    },
    {
      id: "org.apache.axis:axis-jaxrpc@1.4",
      info: {
        name: "org.apache.axis:axis-jaxrpc",
        version: "1.4"
      }
    },
    {
      id: "org.apache.axis:axis-saaj@1.4",
      info: {
        name: "org.apache.axis:axis-saaj",
        version: "1.4"
      }
    },
    {
      id: "axis:axis-wsdl4j@1.5.1",
      info: {
        name: "axis:axis-wsdl4j",
        version: "1.5.1"
      }
    },
    {
      id: "commons-logging:commons-logging@1.0.4",
      info: {
        name: "commons-logging:commons-logging",
        version: "1.0.4"
      }
    },
    {
      id: "commons-discovery:commons-discovery@0.2",
      info: {
        name: "commons-discovery:commons-discovery",
        version: "0.2"
      }
    },
    {
      id: "org.hamcrest:hamcrest-core@1.1",
      info: {
        name: "org.hamcrest:hamcrest-core",
        version: "1.1"
      }
    }
  ],
  graph: {
    rootNodeId: "root-node",
    nodes: [
      {
        nodeId: "root-node",
        pkgId: "io.snyk.example:test-project@1.0-SNAPSHOT",
        deps: [
          {
            nodeId: "axis:axis:jar:1.4:compile"
          },
          {
            nodeId: "junit:junit:jar:4.10:test"
          }
        ]
      },
      {
        nodeId: "axis:axis:jar:1.4:compile",
        pkgId: "axis:axis@1.4",
        deps: [
          {
            nodeId: "org.apache.axis:axis-jaxrpc:jar:1.4:compile"
          },
          {
            nodeId: "org.apache.axis:axis-saaj:jar:1.4:compile"
          },
          {
            nodeId: "axis:axis-wsdl4j:jar:1.5.1:runtime"
          },
          {
            nodeId: "commons-logging:commons-logging:jar:1.0.4:runtime"
          },
          {
            nodeId: "commons-discovery:commons-discovery:jar:0.2:runtime"
          }
        ]
      },
      {
        nodeId: "junit:junit:jar:4.10:test",
        pkgId: "junit:junit@4.10",
        deps: [
          {
            nodeId: "org.hamcrest:hamcrest-core:jar:1.1:test"
          }
        ]
      },
      {
        nodeId: "org.apache.axis:axis-jaxrpc:jar:1.4:compile",
        pkgId: "org.apache.axis:axis-jaxrpc@1.4",
        deps: []
      },
      {
        nodeId: "org.apache.axis:axis-saaj:jar:1.4:compile",
        pkgId: "org.apache.axis:axis-saaj@1.4",
        deps: []
      },
      {
        nodeId: "axis:axis-wsdl4j:jar:1.5.1:runtime",
        pkgId: "axis:axis-wsdl4j@1.5.1",
        deps: []
      },
      {
        nodeId: "commons-logging:commons-logging:jar:1.0.4:runtime",
        pkgId: "commons-logging:commons-logging@1.0.4",
        deps: []
      },
      {
        nodeId: "commons-discovery:commons-discovery:jar:0.2:runtime",
        pkgId: "commons-discovery:commons-discovery@0.2",
        deps: [
          {
            nodeId: "commons-logging:commons-logging:jar:1.0.4:runtime:pruned"
          }
        ]
      },
      {
        nodeId: "org.hamcrest:hamcrest-core:jar:1.1:test",
        pkgId: "org.hamcrest:hamcrest-core@1.1",
        deps: []
      },
      {
        nodeId: "commons-logging:commons-logging:jar:1.0.4:runtime:pruned",
        pkgId: "commons-logging:commons-logging@1.0.4",
        deps: [],
        info: {
          labels: {
            pruned: "true"
          }
        }
      }
    ]
  }
}
