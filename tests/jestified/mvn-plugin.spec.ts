import { createFromJSON } from '@snyk/dep-graph';
import {
  smallVerboseDepGraphNewMvnPlugin,
} from './fixtures/verbose-depgraph';
import * as plugin from '../../lib';
import * as path from 'path';
import { MultiProjectResult } from '@snyk/cli-interface/legacy/plugin';
import * as subProcess from '../../lib/sub-process';

const testsPath = path.join(__dirname, '..');
const fixturesPath = path.join(testsPath, 'fixtures');

it('inspect on test-project pom - verbose', async () => {
  const result: MultiProjectResult = await plugin.inspect(
    '.',
    path.join(fixturesPath, 'test-project', 'pom.xml'),
    { dev: true, args: ['-Dverbose=true'] },
  ) as MultiProjectResult;
  const project = result.scannedProjects?.pop();
  expect(project).toBeDefined();
  expect(project?.depGraph?.toJSON()).toEqual(smallVerboseDepGraphNewMvnPlugin);
});

it('inspect on test-project pom - verbose + maven version < 3.2.5', async () => {
  // this forces to go through the tree output parsing
  jest.spyOn(subProcess, 'execute').mockResolvedValueOnce('3.0.0');
  const result: MultiProjectResult = await plugin.inspect(
    '.',
    path.join(fixturesPath, 'test-project', 'pom.xml'),
    { dev: true, args: ['-Dverbose=true'] },
  ) as MultiProjectResult;
  const project = result.scannedProjects?.pop();
  expect(project).toBeDefined();
  expect(project?.depGraph?.toJSON()).toEqual(smallVerboseDepGraphNewMvnPlugin);
});
