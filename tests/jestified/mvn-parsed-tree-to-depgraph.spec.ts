import { parseTrees } from '../../lib/parse/tree';
import { createFromJSON } from '@snyk/dep-graph';
import { parseStdout } from '../../lib/parse/stdout';
import {
  smallVerboseDepGraphData,
  largeVerboseDepGraphData,
} from './fixtures/verbose-depgraph';
import { verboseAggregatedProjects } from './fixtures/verbose-aggregated-projects';

it('small - output from mvn dependency:tree -Dverbose to be parsed from tree to depgraph', () => {
  const input = `io.snyk.example:test-project:jar:1.0-SNAPSHOT
  +- axis:axis:jar:1.4:compile
  |  +- org.apache.axis:axis-jaxrpc:jar:1.4:compile
  |  +- org.apache.axis:axis-saaj:jar:1.4:compile
  |  +- axis:axis-wsdl4j:jar:1.5.1:runtime
  |  +- commons-logging:commons-logging:jar:1.0.4:runtime
  |  \- commons-discovery:commons-discovery:jar:0.2:runtime
  \- junit:junit:jar:4.10:test
     \- org.hamcrest:hamcrest-core:jar:1.1:test`;
  const depGraph = parseTrees([input])[0].depGraph;
  expect(depGraph?.equals(createFromJSON(smallVerboseDepGraphData))).toBe(true);
});

it('large - output from mvn dependency:tree -Dverbose to be parsed from tree to depgraph', () => {
  const input = `io.snyk.example:test-project:jar:1.0-SNAPSHOT
  +- org.springframework.boot:spring-boot-starter-test:jar:2.7.15:test
  |  +- org.springframework.boot:spring-boot-starter:jar:2.7.15:test
  |  |  +- org.springframework.boot:spring-boot:jar:2.7.15:test
  |  |  |  +- (org.springframework:spring-core:jar:5.3.29:test - omitted for duplicate)
  |  |  |  \- org.springframework:spring-context:jar:5.3.29:test
  |  |  |     +- org.springframework:spring-aop:jar:5.3.29:test
  |  |  |     |  +- (org.springframework:spring-beans:jar:5.3.29:test - omitted for duplicate)
  |  |  |     |  \- (org.springframework:spring-core:jar:5.3.29:test - omitted for duplicate)
  |  |  |     +- org.springframework:spring-beans:jar:5.3.29:test
  |  |  |     |  \- (org.springframework:spring-core:jar:5.3.29:test - omitted for duplicate)
  |  |  |     +- (org.springframework:spring-core:jar:5.3.29:test - omitted for duplicate)
  |  |  |     \- org.springframework:spring-expression:jar:5.3.29:test
  |  |  |        \- (org.springframework:spring-core:jar:5.3.29:test - omitted for duplicate)
  |  |  +- org.springframework.boot:spring-boot-autoconfigure:jar:2.7.15:test
  |  |  |  \- (org.springframework.boot:spring-boot:jar:2.7.15:test - omitted for duplicate)
  |  |  +- org.springframework.boot:spring-boot-starter-logging:jar:2.7.15:test
  |  |  |  +- ch.qos.logback:logback-classic:jar:1.2.12:test
  |  |  |  |  +- ch.qos.logback:logback-core:jar:1.2.12:test
  |  |  |  |  \- (org.slf4j:slf4j-api:jar:1.7.32:test - omitted for conflict with 1.7.33)
  |  |  |  +- org.apache.logging.log4j:log4j-to-slf4j:jar:2.17.2:test
  |  |  |  |  +- (org.slf4j:slf4j-api:jar:1.7.35:test - omitted for conflict with 1.7.32)
  |  |  |  |  \- org.apache.logging.log4j:log4j-api:jar:2.17.2:test
  |  |  |  \- org.slf4j:jul-to-slf4j:jar:1.7.36:test
  |  |  |     \- (org.slf4j:slf4j-api:jar:1.7.36:test - omitted for conflict with 1.7.32)
  |  |  +- jakarta.annotation:jakarta.annotation-api:jar:1.3.5:test
  |  |  +- (org.springframework:spring-core:jar:5.3.29:test - omitted for duplicate)
  |  |  \- (org.yaml:snakeyaml:jar:1.30:test - omitted for conflict with 1.33)
  |  +- org.springframework.boot:spring-boot-test:jar:2.7.15:test
  |  |  \- (org.springframework.boot:spring-boot:jar:2.7.15:test - omitted for duplicate)
  |  +- org.springframework.boot:spring-boot-test-autoconfigure:jar:2.7.15:test
  |  |  +- (org.springframework.boot:spring-boot:jar:2.7.15:test - omitted for duplicate)
  |  |  +- (org.springframework.boot:spring-boot-test:jar:2.7.15:test - omitted for duplicate)
  |  |  \- (org.springframework.boot:spring-boot-autoconfigure:jar:2.7.15:test - omitted for duplicate)
  |  +- com.jayway.jsonpath:json-path:jar:2.7.0:test
  |  |  +- net.minidev:json-smart:jar:2.4.7:test
  |  |  |  \- net.minidev:accessors-smart:jar:2.4.7:test
  |  |  |     \- org.ow2.asm:asm:jar:9.1:test
  |  |  \- org.slf4j:slf4j-api:jar:1.7.33:test
  |  +- jakarta.xml.bind:jakarta.xml.bind-api:jar:2.3.3:test
  |  |  \- jakarta.activation:jakarta.activation-api:jar:1.2.2:test
  |  +- org.assertj:assertj-core:jar:3.22.0:test
  |  +- org.hamcrest:hamcrest:jar:2.2:test
  |  +- org.junit.jupiter:junit-jupiter:jar:5.8.2:test
  |  |  +- org.junit.jupiter:junit-jupiter-api:jar:5.8.2:test
  |  |  |  +- org.opentest4j:opentest4j:jar:1.2.0:test
  |  |  |  +- org.junit.platform:junit-platform-commons:jar:1.8.2:test
  |  |  |  |  \- (org.apiguardian:apiguardian-api:jar:1.1.2:test - omitted for duplicate)
  |  |  |  \- org.apiguardian:apiguardian-api:jar:1.1.2:test
  |  |  +- org.junit.jupiter:junit-jupiter-params:jar:5.8.2:test
  |  |  |  +- (org.junit.jupiter:junit-jupiter-api:jar:5.8.2:test - omitted for duplicate)
  |  |  |  \- (org.apiguardian:apiguardian-api:jar:1.1.2:test - omitted for duplicate)
  |  |  \- org.junit.jupiter:junit-jupiter-engine:jar:5.8.2:test
  |  |     +- org.junit.platform:junit-platform-engine:jar:1.8.2:test
  |  |     |  +- (org.opentest4j:opentest4j:jar:1.2.0:test - omitted for duplicate)
  |  |     |  +- (org.junit.platform:junit-platform-commons:jar:1.8.2:test - omitted for duplicate)
  |  |     |  \- (org.apiguardian:apiguardian-api:jar:1.1.2:test - omitted for duplicate)
  |  |     +- (org.junit.jupiter:junit-jupiter-api:jar:5.8.2:test - omitted for duplicate)
  |  |     \- (org.apiguardian:apiguardian-api:jar:1.1.2:test - omitted for duplicate)
  |  +- org.mockito:mockito-core:jar:4.5.1:test
  |  |  +- net.bytebuddy:byte-buddy:jar:1.12.9:test
  |  |  +- net.bytebuddy:byte-buddy-agent:jar:1.12.9:test
  |  |  \- org.objenesis:objenesis:jar:3.2:test
  |  +- org.mockito:mockito-junit-jupiter:jar:4.5.1:test
  |  |  +- (org.mockito:mockito-core:jar:4.5.1:test - omitted for duplicate)
  |  |  \- (org.junit.jupiter:junit-jupiter-api:jar:5.8.2:test - omitted for duplicate)
  |  +- org.skyscreamer:jsonassert:jar:1.5.1:test
  |  |  \- com.vaadin.external.google:android-json:jar:0.0.20131108.vaadin1:test
  |  +- org.springframework:spring-core:jar:5.3.29:test
  |  |  \- org.springframework:spring-jcl:jar:5.3.29:test
  |  +- org.springframework:spring-test:jar:5.3.29:test
  |  |  \- (org.springframework:spring-core:jar:5.3.29:test - omitted for duplicate)
  |  \- org.xmlunit:xmlunit-core:jar:2.9.1:test
  |     \- (jakarta.xml.bind:jakarta.xml.bind-api:jar:2.3.3:test - omitted for duplicate)
  +- com.fasterxml.jackson.dataformat:jackson-dataformat-yaml:jar:2.14.2:compile
  |  +- com.fasterxml.jackson.core:jackson-databind:jar:2.14.2:compile
  |  |  +- com.fasterxml.jackson.core:jackson-annotations:jar:2.14.2:compile
  |  |  \- (com.fasterxml.jackson.core:jackson-core:jar:2.14.2:compile - omitted for duplicate)
  |  +- org.yaml:snakeyaml:jar:1.33:compile
  |  \- com.fasterxml.jackson.core:jackson-core:jar:2.14.2:compile
  +- axis:axis:jar:1.4:compile
  |  +- org.apache.axis:axis-jaxrpc:jar:1.4:compile
  |  +- org.apache.axis:axis-saaj:jar:1.4:compile
  |  +- axis:axis-wsdl4j:jar:1.5.1:runtime
  |  +- commons-logging:commons-logging:jar:1.0.4:runtime
  |  \- commons-discovery:commons-discovery:jar:0.2:runtime
  |     \- (commons-logging:commons-logging:jar:1.0.3:runtime - omitted for conflict with 1.0.4)
  \- junit:junit:jar:4.10:test
     \- org.hamcrest:hamcrest-core:jar:1.1:test`;

  const depGraph = parseTrees([input])[0].depGraph;
  expect(depGraph?.equals(createFromJSON(largeVerboseDepGraphData))).toBe(true);
});

it('aggregate maven projects - output with labels from mvn dependency:tree -Dverbose to be parsed from tree to depgraph', () => {
  const input = `[INFO] Scanning for projects...
  [INFO] ------------------------------------------------------------------------
  [INFO] Reactor Build Order:
  [INFO] 
  [INFO] aggregate-project                                                  [pom]
  [INFO] core                                                               [jar]
  [INFO] web                                                                [jar]
  [INFO] 
  [INFO] ---------------------< io.snyk:aggregate-project >----------------------
  [INFO] Building aggregate-project 1.0.0                                   [1/3]
  [INFO] --------------------------------[ pom ]---------------------------------
  [INFO] 
  [INFO] --- maven-dependency-plugin:2.8:tree (default-cli) @ aggregate-project ---
  [INFO] io.snyk:aggregate-project:pom:1.0.0
  [INFO] 
  [INFO] ----------------------------< io.snyk:core >----------------------------
  [INFO] Building core 1.0.0                                                [2/3]
  [INFO] --------------------------------[ jar ]---------------------------------
  [INFO] 
  [INFO] --- maven-dependency-plugin:2.8:tree (default-cli) @ core ---
  [INFO] io.snyk:core:jar:1.0.0
  [INFO] +- org.apache.logging.log4j:log4j-api:jar:2.17.2:compile
  [INFO] \- org.apache.logging.log4j:log4j-core:jar:2.17.2:compile
  [INFO]    \- (org.apache.logging.log4j:log4j-api:jar:2.17.2:compile - omitted for duplicate)
  [INFO] 
  [INFO] ----------------------------< io.snyk:web >-----------------------------
  [INFO] Building web 1.0.0                                                 [3/3]
  [INFO] --------------------------------[ jar ]---------------------------------
  [INFO] 
  [INFO] --- maven-dependency-plugin:2.8:tree (default-cli) @ web ---
  [INFO] io.snyk:web:jar:1.0.0
  [INFO] +- org.springframework:spring-web:jar:5.3.21:compile
  [INFO] |  +- org.springframework:spring-beans:jar:5.3.21:compile
  [INFO] |  |  \- (org.springframework:spring-core:jar:5.3.21:compile - omitted for duplicate)
  [INFO] |  \- org.springframework:spring-core:jar:5.3.21:compile
  [INFO] |     \- org.springframework:spring-jcl:jar:5.3.21:compile
  [INFO] \- org.junit.jupiter:junit-jupiter-engine:jar:5.8.1:test
  [INFO]    +- org.junit.platform:junit-platform-engine:jar:1.8.1:test
  [INFO]    |  +- org.opentest4j:opentest4j:jar:1.2.0:test
  [INFO]    |  +- org.junit.platform:junit-platform-commons:jar:1.8.1:test
  [INFO]    |  |  \- (org.apiguardian:apiguardian-api:jar:1.1.2:test - omitted for duplicate)
  [INFO]    |  \- (org.apiguardian:apiguardian-api:jar:1.1.2:test - omitted for duplicate)
  [INFO]    +- org.junit.jupiter:junit-jupiter-api:jar:5.8.1:test
  [INFO]    |  +- (org.opentest4j:opentest4j:jar:1.2.0:test - omitted for duplicate)
  [INFO]    |  +- (org.junit.platform:junit-platform-commons:jar:1.8.1:test - omitted for duplicate)
  [INFO]    |  \- (org.apiguardian:apiguardian-api:jar:1.1.2:test - omitted for duplicate)
  [INFO]    \- org.apiguardian:apiguardian-api:jar:1.1.2:test
  [INFO] ------------------------------------------------------------------------
  [INFO] Reactor Summary for aggregate-project 1.0.0:
  [INFO] 
  [INFO] aggregate-project .................................. SUCCESS [  0.495 s]
  [INFO] core ............................................... SUCCESS [  0.089 s]
  [INFO] web ................................................ SUCCESS [  0.035 s]
  [INFO] ------------------------------------------------------------------------
  [INFO] BUILD SUCCESS
  [INFO] ------------------------------------------------------------------------
  [INFO] Total time:  0.820 s
  [INFO] Finished at: 2024-03-07T22:59:07+02:00
  [INFO] ------------------------------------------------------------------------`;

  const parsedOutputs = parseStdout(input, true);
  const scannedProjects = parseTrees(parsedOutputs);
  expect(scannedProjects.length).toBe(3);

  scannedProjects.forEach((scannedProject) => {
    const name = scannedProject.depGraph?.rootPkg.name || '';
    const expectedDepGraph = verboseAggregatedProjects[name];
    expect(
      scannedProject.depGraph?.equals(createFromJSON(expectedDepGraph)),
    ).toBe(true);
  });
});
