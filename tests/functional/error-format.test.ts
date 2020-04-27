import * as test from 'tap-only';

import {
  formatCallGraphError,
  formatGenericPluginError,
} from '../../lib/error-format';
import { CallGraphError } from '../../lib/errors/call-graph-error';

test('formatCallGraphError - not target folder', (t) => {
  const err = new CallGraphError('Could not find target folder', new Error());
  t.equals(
    formatCallGraphError(err),
    'Failed to scan for reachable vulns. Please compile your code by running `mvn compile` and try again.',
    'correct error for no target folder',
  );
  t.end();
});

test('formatCallGraphError - not entrypoints', (t) => {
  const err = new CallGraphError('No entrypoints found', new Error());
  t.equals(
    formatCallGraphError(err),
    "Failed to scan for reachable vulns. Couldn't find the application entry point.",
    'correct error for no target folder',
  );
  t.end();
});

test('formatCallGraphError - generic call graph error', (t) => {
  const err = new CallGraphError('Some call graph error', new Error());
  t.equals(
    formatCallGraphError(err),
    'Failed to scan for reachable vulns. Please contact our support or submit ' +
      'an issue at https://github.com/snyk/java-call-graph-builder/issues.',
    'correct error for generic call graph error',
  );
  t.end();
});

test('formatGenericPluginError - generic call graph error', (t) => {
  const err = new Error('Some Generic Plugin Error');
  t.equals(
    formatGenericPluginError(err, 'mvn cmd', ['arg1', 'arg2']),
    'Some Generic Plugin Error\n' +
      '\n' +
      'Please make sure that Apache Maven Dependency Plugin version 2.2 or above is installed, ' +
      'and that `mvn cmd arg1 arg2` executes successfully on this project.\n' +
      '\n' +
      'If the problem persists, collect the output of `mvn cmd arg1 arg2` and contact support@snyk.io\n',
    'correct error for generic plugin error',
  );
  t.end();
});
