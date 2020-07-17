import * as path from 'path';
import * as test from 'tap-only';
import * as sinon from 'sinon';
import * as javaCallGraphBuilder from '@snyk/java-call-graph-builder';
import { CallGraph, CallGraphError } from '@snyk/cli-interface/legacy/common';

import * as plugin from '../../lib';
import { readFixtureJSON } from '../file-helper';
import { SinglePackageResult } from '@snyk/cli-interface/legacy/plugin';

const testsPath = path.join(__dirname, '..');
const fixturesPath = path.join(testsPath, 'fixtures');
const testProjectPath = path.join(fixturesPath, 'test-project');

test('inspect on test-project pom with reachable vulns no entry points found', async (t) => {
  const javaCallGraphBuilderStub = sinon
    .stub(javaCallGraphBuilder, 'getCallGraphMvn')
    .rejects(new Error('No entrypoints found'));

  t.tearDown(() => {
    javaCallGraphBuilderStub.restore();
  });

  const result = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      reachableVulns: true,
    },
  );

  if ('callGraph' in result && 'innerError' in result.callGraph) {
    const err = result.callGraph;
    t.ok(
      javaCallGraphBuilderStub.calledOnce,
      'called to the call graph builder',
    );
    t.ok(
      javaCallGraphBuilderStub.calledWith(testProjectPath),
      'call graph builder was called with the correct path',
    );
    t.equals(
      err.message,
      'Failed to scan for reachable vulns. Please contact our support or submit an issue at https://github.com/snyk/java-call-graph-builder/issues.',
      'correct error message',
    );
    t.equals(
      err.innerError.message,
      'No entrypoints found',
      'correct inner error',
    );
  } else {
    t.fail('the call to inspect() should have failed to generate a call graph');
  }
});

test('inspect on test-project pom with reachable vulns', async (t) => {
  const mavenCallGraph = await readFixtureJSON('call-graphs', 'simple.json');
  const javaCallGraphBuilderStub = sinon
    .stub(javaCallGraphBuilder, 'getCallGraphMvn')
    .resolves(mavenCallGraph as CallGraph);

  const metrics = {
    getEntrypoints: 0,
    generateCallGraph: 13,
    mapClassesPerJar: 12,
    getCallGraph: 10,
  };
  const callGraphMetrics = sinon
    .stub(javaCallGraphBuilder, 'runtimeMetrics')
    .returns(metrics);

  const result = await plugin.inspect(
    '.',
    path.join(testProjectPath, 'pom.xml'),
    {
      reachableVulns: true,
    },
  );
  const expected = await readFixtureJSON(
    'test-project',
    'expected-with-call-graph.json',
  );
  t.ok(javaCallGraphBuilderStub.calledOnce, 'called to the call graph builder');
  t.ok(
    javaCallGraphBuilderStub.calledWith(testProjectPath),
    'call graph builder was called with the correct path',
  );
  t.ok(callGraphMetrics.calledOnce, 'callgraph metrics were fetched');
  t.equals((result.plugin.meta as any).callGraphMetrics, metrics);

  delete result.plugin.meta;
  t.same(result, expected, 'should return expected result');
  t.tearDown(() => {
    javaCallGraphBuilderStub.restore();
  });
});
