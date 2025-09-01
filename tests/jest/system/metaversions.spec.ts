import type { PkgInfo } from '@snyk/dep-graph';
import * as path from 'path';
import { legacyPlugin } from '@snyk/cli-interface';
import * as plugin from '../../../lib';
import { MultiProjectResult } from '@snyk/cli-interface/legacy/plugin';

const testsPath = path.join(__dirname, '../..');
const fixturesPath = path.join(testsPath, 'fixtures');

function getDepPkgs(
  rootPkgName: string,
  result: legacyPlugin.MultiProjectResult,
): PkgInfo[] | undefined {
  const project = result.scannedProjects.find(
    (p) => p.depGraph?.rootPkg.name === rootPkgName,
  );
  return project?.depGraph?.getDepPkgs();
}

describe('metaversion resolution', () => {
  test('inspect on simple project with metaversions', async () => {
    const res = await plugin.inspect(
      path.join(fixturesPath, 'metaversion-simple'),
      'pom.xml',
      {
        dev: true,
      },
    );

    expect(legacyPlugin.isMultiResult(res)).toBeTruthy();
    const result: MultiProjectResult = res as any;

    expect(result.scannedProjects.length).toEqual(1);
    expect(result.scannedProjects[0].depGraph).toBeDefined();
    const depPkgs = result.scannedProjects[0].depGraph?.getDepPkgs();
    expect(depPkgs).toBeDefined();

    // Verify the specific dependencies are present
    const resteasyCore = depPkgs?.find(
      (pkg) => pkg.name === 'org.jboss.resteasy:resteasy-core',
    );
    const commonsLang = depPkgs?.find(
      (pkg) => pkg.name === 'commons-lang:commons-lang',
    );
    const junit = depPkgs?.find((pkg) => pkg.name === 'junit:junit');

    expect(resteasyCore).toBeDefined();
    expect(commonsLang).toBeDefined();

    // Metaversions should be resolved to concrete versions
    expect(resteasyCore?.version).not.toBe('RELEASE');
    expect(commonsLang?.version).not.toBe('LATEST');
    expect(junit?.version).toBe('4.13.2');

    // Check that resolved versions follow expected patterns
    expect(resteasyCore?.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(commonsLang?.version).toMatch(/^\d+\.\d+/);
  }, 30000);

  test('inspect on aggregate project with metaversions (non-verbose)', async () => {
    // IMPORTANT: Non-verbose aggregate mode has partial metaversion resolution:
    // - Direct dependencies at module level: RESOLVED (via test-compile)
    // - Transitive dependencies from other modules: STILL METAVERSIONS
    // This is a key edge case our implementation needs to handle
    const res = await plugin.inspect(
      path.join(fixturesPath, 'metaversion-aggregate'),
      'pom.xml',
      {
        mavenAggregateProject: true,
      },
    );

    expect(legacyPlugin.isMultiResult(res)).toBeTruthy();
    const result: MultiProjectResult = res as any;

    expect(result.scannedProjects.length).toEqual(3); // parent + 2 modules

    // Check parent project (should have no dependencies)
    expect(
      getDepPkgs('io.snyk.example:metaversion-aggregate', result)?.length,
    ).toEqual(0);

    // Check module-core dependencies
    const coreDepPkgs = getDepPkgs('io.snyk.example:module-core', result);
    expect(coreDepPkgs).toBeDefined();

    const httpclient = coreDepPkgs?.find(
      (pkg) => pkg.name === 'org.apache.httpcomponents:httpclient',
    );
    const springCore = coreDepPkgs?.find(
      (pkg) => pkg.name === 'org.springframework:spring-core',
    );
    const jacksonCore = coreDepPkgs?.find(
      (pkg) => pkg.name === 'com.fasterxml.jackson.core:jackson-core',
    );

    expect(httpclient).toBeDefined();
    expect(springCore).toBeDefined();
    expect(jacksonCore).toBeDefined();

    // Non-verbose aggregate mode already resolves metaversions via test-compile
    // So we expect resolved versions, not metaversions
    expect(httpclient?.version).not.toBe('RELEASE');
    expect(springCore?.version).not.toBe('RELEASE');
    expect(jacksonCore?.version).not.toBe('LATEST');

    // Check that we get concrete version patterns
    expect(httpclient?.version).toMatch(/^\d+\.\d+/);
    expect(springCore?.version).toMatch(/^\d+\.\d+/);
    expect(jacksonCore?.version).toMatch(/^\d+\.\d+/);

    // Check module-web dependencies
    const webDepPkgs = getDepPkgs('io.snyk.example:module-web', result);
    expect(webDepPkgs).toBeDefined();

    const moduleCore = webDepPkgs?.find(
      (pkg) => pkg.name === 'io.snyk.example:module-core',
    );
    const slf4jApi = webDepPkgs?.find(
      (pkg) => pkg.name === 'org.slf4j:slf4j-api',
    );
    const commonsCollections = webDepPkgs?.find(
      (pkg) => pkg.name === 'org.apache.commons:commons-collections4',
    );
    const servletApi = webDepPkgs?.find(
      (pkg) => pkg.name === 'javax.servlet:javax.servlet-api',
    );

    // DEBUG: Check for transitive dependencies from module-core
    const webHttpclient = webDepPkgs?.find(
      (pkg) => pkg.name === 'org.apache.httpcomponents:httpclient',
    );
    const webSpringCore = webDepPkgs?.find(
      (pkg) => pkg.name === 'org.springframework:spring-core',
    );
    const webJacksonCore = webDepPkgs?.find(
      (pkg) => pkg.name === 'com.fasterxml.jackson.core:jackson-core',
    );

    expect(moduleCore).toBeDefined();
    expect(slf4jApi).toBeDefined();
    expect(commonsCollections).toBeDefined();
    expect(servletApi).toBeDefined();

    // Inter-module dependency should use project version
    expect(moduleCore?.version).toBe('1.0-SNAPSHOT');

    // Non-verbose mode resolves DIRECT dependencies but NOT transitive ones
    expect(slf4jApi?.version).not.toBe('LATEST');
    expect(commonsCollections?.version).not.toBe('LATEST');
    expect(servletApi?.version).not.toBe('RELEASE');

    // Check concrete version patterns for direct dependencies
    expect(slf4jApi?.version).toMatch(/^\d+\.\d+/);
    expect(commonsCollections?.version).toMatch(/^\d+\.\d+/);
    expect(servletApi?.version).toMatch(/^\d+\.\d+/);

    // Transitive metaversions should also be resolved - this is the critical edge case!
    expect(webHttpclient?.version).not.toBe('RELEASE');
    expect(webSpringCore?.version).not.toBe('RELEASE');
    expect(webJacksonCore?.version).not.toBe('LATEST');

    // Check concrete version patterns for transitive dependencies
    expect(webHttpclient?.version).toMatch(/^\d+\.\d+/);
    expect(webSpringCore?.version).toMatch(/^\d+\.\d+/);
    expect(webJacksonCore?.version).toMatch(/^\d+\.\d+/);
  }, 60000);

  test('inspect on aggregate project with metaversions (verbose mode)', async () => {
    const res = await plugin.inspect(
      path.join(fixturesPath, 'metaversion-aggregate'),
      'pom.xml',
      {
        mavenAggregateProject: true,
        args: ['-Dverbose'],
      },
    );

    expect(legacyPlugin.isMultiResult(res)).toBeTruthy();
    const result: MultiProjectResult = res as any;

    expect(result.scannedProjects.length).toEqual(3);

    // Check module-core dependencies
    const coreDepPkgs = getDepPkgs('io.snyk.example:module-core', result);
    expect(coreDepPkgs).toBeDefined();

    const httpclient = coreDepPkgs?.find(
      (pkg) => pkg.name === 'org.apache.httpcomponents:httpclient',
    );
    const springCore = coreDepPkgs?.find(
      (pkg) => pkg.name === 'org.springframework:spring-core',
    );
    const jacksonCore = coreDepPkgs?.find(
      (pkg) => pkg.name === 'com.fasterxml.jackson.core:jackson-core',
    );

    expect(httpclient).toBeDefined();
    expect(springCore).toBeDefined();
    expect(jacksonCore).toBeDefined();

    // Verbose mode should resolve all metaversions
    expect(httpclient?.version).not.toBe('RELEASE');
    expect(springCore?.version).not.toBe('RELEASE');
    expect(jacksonCore?.version).not.toBe('LATEST');

    // Check concrete version patterns
    expect(httpclient?.version).toMatch(/^\d+\.\d+/);
    expect(springCore?.version).toMatch(/^\d+\.\d+/);
    expect(jacksonCore?.version).toMatch(/^\d+\.\d+/);

    // Check module-web dependencies
    const webDepPkgs = getDepPkgs('io.snyk.example:module-web', result);
    const slf4jApi = webDepPkgs?.find(
      (pkg) => pkg.name === 'org.slf4j:slf4j-api',
    );
    const commonsCollections = webDepPkgs?.find(
      (pkg) => pkg.name === 'org.apache.commons:commons-collections4',
    );
    const servletApi = webDepPkgs?.find(
      (pkg) => pkg.name === 'javax.servlet:javax.servlet-api',
    );

    // Verbose mode should resolve all metaversions including in module-web
    expect(slf4jApi?.version).not.toBe('LATEST');
    expect(commonsCollections?.version).not.toBe('LATEST');
    expect(servletApi?.version).not.toBe('RELEASE');

    // Check concrete version patterns
    expect(slf4jApi?.version).toMatch(/^\d+\.\d+/);
    expect(commonsCollections?.version).toMatch(/^\d+\.\d+/);
    expect(servletApi?.version).toMatch(/^\d+\.\d+/);

    // Also test transitive dependencies from module-core in verbose mode
    const webHttpclientVerbose = webDepPkgs?.find(
      (pkg) => pkg.name === 'org.apache.httpcomponents:httpclient',
    );
    const webSpringCoreVerbose = webDepPkgs?.find(
      (pkg) => pkg.name === 'org.springframework:spring-core',
    );
    const webJacksonCoreVerbose = webDepPkgs?.find(
      (pkg) => pkg.name === 'com.fasterxml.jackson.core:jackson-core',
    );

    // Verbose mode should also resolve transitive metaversions - consistent with non-verbose behavior
    expect(webHttpclientVerbose?.version).not.toBe('RELEASE');
    expect(webSpringCoreVerbose?.version).not.toBe('RELEASE');
    expect(webJacksonCoreVerbose?.version).not.toBe('LATEST');

    // Check concrete version patterns for transitive dependencies in verbose mode
    expect(webHttpclientVerbose?.version).toMatch(/^\d+\.\d+/);
    expect(webSpringCoreVerbose?.version).toMatch(/^\d+\.\d+/);
    expect(webJacksonCoreVerbose?.version).toMatch(/^\d+\.\d+/);
  }, 60000);
});
