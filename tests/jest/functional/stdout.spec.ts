import {
  parseDigraphsFromStdout,
  parsePluginVersionFromStdout,
} from '../../../lib/parse/stdout';
import { parseDigraphs } from '../../../lib/parse/digraph';

const singleProjectStdout = `[INFO] Scanning for projects...
[INFO] 
[INFO] -----------------------< io.snyk:single-project >-----------------------
[INFO] Building single-project 0.0.1-SNAPSHOT
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- maven-dependency-plugin:2.8:tree (default-cli) @ single-project ---
[INFO] digraph "io.snyk:single-project:jar:0.0.1-SNAPSHOT" { 
[INFO] 	"io.snyk:single-project:jar:0.0.1-SNAPSHOT" -> "org.springframework:spring-web:jar:5.3.20:compile" ; 
[INFO] 	"org.springframework:spring-web:jar:5.3.20:compile" -> "org.springframework:spring-beans:jar:5.3.20:compile" ; 
[INFO] 	"org.springframework:spring-web:jar:5.3.20:compile" -> "org.springframework:spring-core:jar:5.3.20:compile" ; 
[INFO] 	"org.springframework:spring-core:jar:5.3.20:compile" -> "org.springframework:spring-jcl:jar:5.3.20:compile" ; 
[INFO]  } 
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  0.862 s
[INFO] Finished at: 2022-07-08T14:19:05+01:00
[INFO] ------------------------------------------------------------------------`;

const singleProjectDigraph = `digraph "io.snyk:single-project:jar:0.0.1-SNAPSHOT" { 
"io.snyk:single-project:jar:0.0.1-SNAPSHOT" -> "org.springframework:spring-web:jar:5.3.20:compile" ; 
"org.springframework:spring-web:jar:5.3.20:compile" -> "org.springframework:spring-beans:jar:5.3.20:compile" ; 
"org.springframework:spring-web:jar:5.3.20:compile" -> "org.springframework:spring-core:jar:5.3.20:compile" ; 
"org.springframework:spring-core:jar:5.3.20:compile" -> "org.springframework:spring-jcl:jar:5.3.20:compile" ; 
} `;

test('parseStdout single project', async () => {
  const received = parseDigraphsFromStdout(singleProjectStdout);
  expect(received).toEqual([singleProjectDigraph]);
});

const multiProjectStdout = `[INFO] Scanning for projects...
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
[INFO] digraph "io.snyk:aggregate-project:pom:1.0.0" { 
[INFO]  } 
[INFO] 
[INFO] ----------------------------< io.snyk:core >----------------------------
[INFO] Building core 1.0.0                                                [2/3]
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- maven-resources-plugin:2.6:resources (default-resources) @ core ---
[WARNING] Using platform encoding (UTF-8 actually) to copy filtered resources, i.e. build is platform dependent!
[INFO] skip non existing resourceDirectory snyk-mvn-plugin/tests/fixtures/parse-graphs/aggregate-project/core/src/main/resources
[INFO] 
[INFO] --- maven-compiler-plugin:3.1:compile (default-compile) @ core ---
[INFO] No sources to compile
[INFO] 
[INFO] --- maven-resources-plugin:2.6:testResources (default-testResources) @ core ---
[WARNING] Using platform encoding (UTF-8 actually) to copy filtered resources, i.e. build is platform dependent!
[INFO] skip non existing resourceDirectory snyk-mvn-plugin/tests/fixtures/parse-graphs/aggregate-project/core/src/test/resources
[INFO] 
[INFO] --- maven-compiler-plugin:3.1:testCompile (default-testCompile) @ core ---
[INFO] No sources to compile
[INFO] 
[INFO] --- maven-dependency-plugin:2.8:tree (default-cli) @ core ---
[INFO] digraph "io.snyk:core:jar:1.0.0" { 
[INFO] 	"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ; 
[INFO] 	"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ; 
[INFO]  } 
[INFO] 
[INFO] ----------------------------< io.snyk:web >-----------------------------
[INFO] Building web 1.0.0                                                 [3/3]
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- maven-resources-plugin:2.6:resources (default-resources) @ web ---
[WARNING] Using platform encoding (UTF-8 actually) to copy filtered resources, i.e. build is platform dependent!
[INFO] skip non existing resourceDirectory snyk-mvn-plugin/tests/fixtures/parse-graphs/aggregate-project/web/src/main/resources
[INFO] 
[INFO] --- maven-compiler-plugin:3.1:compile (default-compile) @ web ---
[INFO] No sources to compile
[INFO] 
[INFO] --- maven-resources-plugin:2.6:testResources (default-testResources) @ web ---
[WARNING] Using platform encoding (UTF-8 actually) to copy filtered resources, i.e. build is platform dependent!
[INFO] skip non existing resourceDirectory snyk-mvn-plugin/tests/fixtures/parse-graphs/aggregate-project/web/src/test/resources
[INFO] 
[INFO] --- maven-compiler-plugin:3.1:testCompile (default-testCompile) @ web ---
[INFO] No sources to compile
[INFO] 
[INFO] --- maven-dependency-plugin:2.8:tree (default-cli) @ web ---
[INFO] digraph "io.snyk:web:jar:1.0.0" { 
[INFO] 	"io.snyk:web:jar:1.0.0" -> "io.snyk:core:jar:1.0.0:compile" ; 
[INFO] 	"io.snyk:web:jar:1.0.0" -> "org.springframework:spring-web:jar:5.3.21:compile" ; 
[INFO] 	"io.snyk:core:jar:1.0.0:compile" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ; 
[INFO] 	"io.snyk:core:jar:1.0.0:compile" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ; 
[INFO] 	"org.springframework:spring-web:jar:5.3.21:compile" -> "org.springframework:spring-beans:jar:5.3.21:compile" ; 
[INFO] 	"org.springframework:spring-web:jar:5.3.21:compile" -> "org.springframework:spring-core:jar:5.3.21:compile" ; 
[INFO] 	"org.springframework:spring-core:jar:5.3.21:compile" -> "org.springframework:spring-jcl:jar:5.3.21:compile" ; 
[INFO]  } 
[INFO] ------------------------------------------------------------------------
[INFO] Reactor Summary for aggregate-project 1.0.0:
[INFO] 
[INFO] aggregate-project .................................. SUCCESS [  0.594 s]
[INFO] core ............................................... SUCCESS [  0.259 s]
[INFO] web ................................................ SUCCESS [  0.019 s]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  1.074 s
[INFO] Finished at: 2022-07-06T13:59:43+01:00
[INFO] ------------------------------------------------------------------------`;

const rootProjectDigraph = `digraph "io.snyk:aggregate-project:pom:1.0.0" { 
} `;

const coreProjectDigraph = `digraph "io.snyk:core:jar:1.0.0" { 
"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ; 
"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ; 
} `;

const webProjectDigraph = `digraph "io.snyk:web:jar:1.0.0" { 
"io.snyk:web:jar:1.0.0" -> "io.snyk:core:jar:1.0.0:compile" ; 
"io.snyk:web:jar:1.0.0" -> "org.springframework:spring-web:jar:5.3.21:compile" ; 
"io.snyk:core:jar:1.0.0:compile" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ; 
"io.snyk:core:jar:1.0.0:compile" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ; 
"org.springframework:spring-web:jar:5.3.21:compile" -> "org.springframework:spring-beans:jar:5.3.21:compile" ; 
"org.springframework:spring-web:jar:5.3.21:compile" -> "org.springframework:spring-core:jar:5.3.21:compile" ; 
"org.springframework:spring-core:jar:5.3.21:compile" -> "org.springframework:spring-jcl:jar:5.3.21:compile" ; 
} `;

test('parseStdout multi project', async () => {
  const received = parseDigraphsFromStdout(multiProjectStdout);
  expect(received).toEqual([
    rootProjectDigraph,
    coreProjectDigraph,
    webProjectDigraph,
  ]);
});

const errorStdout = `[INFO] Scanning for projects...
[ERROR] [ERROR] Some problems were encountered while processing the POMs:
`;

const buildSuccessErrorsLogStdout = `[INFO] Scanning for projects...
[INFO] 
[INFO] --------------------< io.snyk.example:test-project >--------------------
[INFO] Building test-project 1.0.0-SNAPSHOT
[INFO] --------------------------------[ jar ]---------------------------------
[INFO] 
[INFO] --- maven-enforcer-plugin:3.4.1:enforce (enforce-error-without-failing-build) @ test-project ---
[WARNING] Rule 0: org.apache.maven.enforcer.rules.version.RequireMavenVersion failed with message:
[ERROR] Always ERROR
[ERROR] Always ERROR 2
[INFO] 
[INFO] --- maven-compiler-plugin:3.1:compile (default-compile) @ test-project ---
[INFO] No sources to compile
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  0.567 s
[INFO] Finished at: 2023-11-29T15:29:55+02:00
[INFO] ------------------------------------------------------------------------
`;

test('output contains errors', async () => {
  expect(() => parseDigraphsFromStdout(errorStdout)).toThrowError(
    expect.objectContaining({
      message: expect.stringMatching('Maven output contains errors.'),
    }),
  );
});

test('output contains error, but succeeds building', async () => {
  expect(() =>
    parseDigraphsFromStdout(buildSuccessErrorsLogStdout),
  ).toThrowError(
    expect.objectContaining({
      message: expect.stringMatching('Cannot find any digraphs.'),
    }),
  );
});

const singleProjectWithNewPluginStdout = `[INFO] Scanning for projects...
[INFO]
[INFO] -----------------------< io.snyk:single-project >-----------------------
[INFO] Building single-project 0.0.1-SNAPSHOT
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- dependency:3.7.0:tree (default-cli) @ single-project ---
[INFO] digraph "io.snyk:single-project:jar:0.0.1-SNAPSHOT" {
[INFO] 	"io.snyk:single-project:jar:0.0.1-SNAPSHOT" -> "org.springframework:spring-web:jar:5.3.20:compile" ;
[INFO] 	"org.springframework:spring-web:jar:5.3.20:compile" -> "org.springframework:spring-beans:jar:5.3.20:compile" ;
[INFO] 	"org.springframework:spring-web:jar:5.3.20:compile" -> "org.springframework:spring-core:jar:5.3.20:compile" ;
[INFO] 	"org.springframework:spring-core:jar:5.3.20:compile" -> "org.springframework:spring-jcl:jar:5.3.20:compile" ;
[INFO]  }
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  0.862 s
[INFO] Finished at: 2025-09-08T14:19:05+01:00
[INFO] ------------------------------------------------------------------------`;

const singleProjectWithNewPluginDigraph = `digraph "io.snyk:single-project:jar:0.0.1-SNAPSHOT" {
"io.snyk:single-project:jar:0.0.1-SNAPSHOT" -> "org.springframework:spring-web:jar:5.3.20:compile" ;
"org.springframework:spring-web:jar:5.3.20:compile" -> "org.springframework:spring-beans:jar:5.3.20:compile" ;
"org.springframework:spring-web:jar:5.3.20:compile" -> "org.springframework:spring-core:jar:5.3.20:compile" ;
"org.springframework:spring-core:jar:5.3.20:compile" -> "org.springframework:spring-jcl:jar:5.3.20:compile" ;
}`;

test('parseStdout single project with dependency plugin 3.7.0', async () => {
  const received = parseDigraphsFromStdout(singleProjectWithNewPluginStdout);
  expect(received).toEqual([singleProjectWithNewPluginDigraph]);
});

// Plugin version parsing tests
describe('parsePluginVersionFromStdout', () => {
  test('should parse old maven-dependency-plugin format', () => {
    const stdout = `[INFO] Scanning for projects...
[INFO]
[INFO] -----------------------< io.snyk:single-project >-----------------------
[INFO] Building single-project 0.0.1-SNAPSHOT
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- maven-dependency-plugin:2.10:tree (default-cli) @ single-project ---
[INFO] digraph "io.snyk:single-project:jar:0.0.1-SNAPSHOT" {
[INFO]  }
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------`;

    const version = parsePluginVersionFromStdout(stdout);
    expect(version).toBe('2.10');
  });

  test('should parse new dependency plugin format with three-digit version', () => {
    const stdout = `[INFO] Scanning for projects...
[INFO]
[INFO] ------------------< io.snyk.example:bad-test-project >------------------
[INFO] Building Test project 1.0-SNAPSHOT
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[WARNING] The POM for no.such.groupId:no.such.artifactId:jar:1.0.0 is missing, no dependency information available
[INFO]
[INFO] --- dependency:10.11.12:tree (default-cli) @ bad-test-project ---
[INFO] digraph "io.snyk.example:bad-test-project:jar:1.0-SNAPSHOT" {
[INFO]  }
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------`;

    const version = parsePluginVersionFromStdout(stdout);
    expect(version).toBe('10.11.12');
  });

  test('should parse new dependency plugin format with two-digit version', () => {
    const stdout = `[INFO] Scanning for projects...
[INFO]
[INFO] -----------------------< io.snyk:single-project >-----------------------
[INFO] Building single-project 0.0.1-SNAPSHOT
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- dependency:3.6:tree (default-cli) @ single-project ---
[INFO] digraph "io.snyk:single-project:jar:0.0.1-SNAPSHOT" {
[INFO] 	"io.snyk:single-project:jar:0.0.1-SNAPSHOT" -> "org.springframework:spring-web:jar:5.3.20:compile" ;
[INFO]  }
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------`;

    const version = parsePluginVersionFromStdout(stdout);
    expect(version).toBe('3.6');
  });

  test('should return empty string when no plugin version found', () => {
    const stdout = `[INFO] Scanning for projects...
[INFO] Building test-project
[INFO] No dependency plugin execution found
[INFO] BUILD SUCCESS`;

    const version = parsePluginVersionFromStdout(stdout);
    expect(version).toBe('');
  });

  test('should parse plugin version from multi-project output', () => {
    const stdout = `[INFO] Scanning for projects...
[INFO] Reactor Build Order:
[INFO]
[INFO] --- maven-dependency-plugin:2.8:tree (default-cli) @ aggregate-project ---
[INFO] digraph "io.snyk:aggregate-project:pom:1.0.0" {
[INFO]  }
[INFO] --- dependency:3.7.0:tree (default-cli) @ core ---
[INFO] digraph "io.snyk:core:jar:1.0.0" {
[INFO]  }
[INFO] BUILD SUCCESS`;

    const version = parsePluginVersionFromStdout(stdout);
    // Should return the first match
    expect(version).toBe('2.8');
  });
});

// OSM-3378: JVM unified-logging GC lines interleaved with Maven stdout
describe('JVM unified logging lines', () => {
  const gcLines = [
    '[4.326s][info][gc] GC(9) Pause Young (Normal) (G1 Evacuation Pause) 24M->8M(64M) 3.123ms',
    '[2026-06-04T10:15:30.123+0000][0.512s][info][gc,heap] GC(0) Eden regions: 3->0(5)',
    '[info][gc] GC(1) Pause Young (Concurrent Start) 12M->6M(32M) 1.2ms',
    '[1.001s][warning][gc,alloc] GC(2) Allocation stall',
    '[INFO] [5.000s][info][gc] GC(10) Pause Remark 30M->30M(64M) 0.9ms',
  ];
  test.each(gcLines)('strips "%s" inside a digraph', (gcLine) => {
    const lines = singleProjectStdout.split('\n');
    const edgeIdx = lines.findIndex((l) => l.includes('->'));
    lines.splice(edgeIdx + 1, 0, gcLine);
    expect(parseDigraphsFromStdout(lines.join('\n'))).toEqual([
      singleProjectDigraph,
    ]);
  });

  test('strips CRLF GC lines', () => {
    const lines = singleProjectStdout.split('\n');
    const edgeIdx = lines.findIndex((l) => l.includes('->'));
    lines.splice(edgeIdx + 1, 0, `${gcLines[0]}\r`);
    expect(parseDigraphsFromStdout(lines.join('\n'))).toEqual([
      singleProjectDigraph,
    ]);
  });

  test('the reported GC line no longer breaks the dependency graph', () => {
    const lines = singleProjectStdout.split('\n');
    const edgeIdx = lines.findIndex((l) => l.includes('->'));
    lines.splice(edgeIdx + 1, 0, gcLines[0]);
    const graphs = parseDigraphs(parseDigraphsFromStdout(lines.join('\n')));
    expect(graphs).toEqual(parseDigraphs([singleProjectDigraph]));
  });
});
