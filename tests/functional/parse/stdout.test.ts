import { test } from 'tap';
import { parseStdout } from '../../../lib/parse/stdout';

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
}`;

test('parseStdout single project', async (t) => {
  const received = parseStdout(singleProjectStdout);
  t.same(received, [singleProjectDigraph], 'contains single digraph');
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
}`;

const coreProjectDigraph = `digraph "io.snyk:core:jar:1.0.0" { 
"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ; 
"io.snyk:core:jar:1.0.0" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ; 
}`;

const webProjectDigraph = `digraph "io.snyk:web:jar:1.0.0" { 
"io.snyk:web:jar:1.0.0" -> "io.snyk:core:jar:1.0.0:compile" ; 
"io.snyk:web:jar:1.0.0" -> "org.springframework:spring-web:jar:5.3.21:compile" ; 
"io.snyk:core:jar:1.0.0:compile" -> "org.apache.logging.log4j:log4j-api:jar:2.17.2:compile" ; 
"io.snyk:core:jar:1.0.0:compile" -> "org.apache.logging.log4j:log4j-core:jar:2.17.2:compile" ; 
"org.springframework:spring-web:jar:5.3.21:compile" -> "org.springframework:spring-beans:jar:5.3.21:compile" ; 
"org.springframework:spring-web:jar:5.3.21:compile" -> "org.springframework:spring-core:jar:5.3.21:compile" ; 
"org.springframework:spring-core:jar:5.3.21:compile" -> "org.springframework:spring-jcl:jar:5.3.21:compile" ; 
}`;

test('parseStdout multi project', async (t) => {
  const received = parseStdout(multiProjectStdout);
  t.same(
    received,
    [rootProjectDigraph, coreProjectDigraph, webProjectDigraph],
    'contains multiple digraphs',
  );
});

const errorStdout = `[INFO] Scanning for projects...
[ERROR] [ERROR] Some problems were encountered while processing the POMs:
`;

test('output contains errors', async (t) => {
  try {
    parseStdout(errorStdout);
    t.fail('expected error to be thrown');
  } catch (err: unknown) {
    if (err instanceof Error) {
      t.equals(
        err.message,
        'Maven output contains errors.',
        'throws expected error',
      );
    } else {
      t.fail('expected err to be instanceof Error');
    }
  }
});

test('output does not contain digraph', async (t) => {
  try {
    parseStdout('bad text');
    t.fail('expected error to be thrown');
  } catch (err: unknown) {
    if (err instanceof Error) {
      t.equals(
        err.message,
        'Cannot find any digraphs.',
        'throws expected error',
      );
    } else {
      t.fail('expected err to be instanceof Error');
    }
  }
});
