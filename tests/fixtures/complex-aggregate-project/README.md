# Aggregate project

Aggregate Maven project, containing a root pom and two modules. One of the modules (web) depends on
another modules (core) using an inherited property.

Only the Maven Reactor is capable of resolving this inter module dependency.

By passing option `mavenAggregateProject` the maven command run parses all digraphs and returns a multi plugin result
containing an array of scan results.

Tested by [../system/reactor.test.ts](reactor.test.ts)
