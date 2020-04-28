import * as path from 'path';
import * as test from 'tap-only';
import * as sinon from 'sinon';
import * as javaCallGraphBuilder from '@snyk/java-call-graph-builder';
import { CallGraph } from '@snyk/cli-interface/legacy/common';

import * as plugin from '../../lib';
import { readFixtureJSON } from '../file-helper';

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

  try {
    await plugin.inspect('.', path.join(testProjectPath, 'pom.xml'), {
      reachableVulns: true,
    });
    t.fail('should not reach here, test should have failed');
  } catch (err) {
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
      "Failed to scan for reachable vulns. Couldn't find the application entry point.",
      'correct error message',
    );
    t.equals(
      err.innerError.message,
      'No entrypoints found',
      'correct inner error',
    );
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
