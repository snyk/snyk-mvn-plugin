import * as path from 'path';
import { createMavenContext } from '../../../../lib/maven/context';
import { shouldPinDependencyPlugin } from '../../../../lib/maven/plugin-declaration';

const FIXTURES = path.resolve(__dirname, '../../../fixtures/plugin-pinning');
const MAVEN_VERSION =
  'Apache Maven 3.6.3 (cecedd343002696d0abb50b32b541b8a6ba2883f)';

function ctx(fixture: string, targetFile: string | undefined = 'pom.xml') {
  return createMavenContext(path.join(FIXTURES, fixture), targetFile);
}

describe('shouldPinDependencyPlugin', () => {
  test('pins when a standalone POM does not mention the plugin', () => {
    expect(
      shouldPinDependencyPlugin(
        ctx('no-declaration'),
        false,
        [],
        MAVEN_VERSION,
      ),
    ).toBe(true);
  });

  test('pins when the target is a directory containing a clean pom.xml', () => {
    expect(
      shouldPinDependencyPlugin(
        ctx('no-declaration', undefined),
        false,
        [],
        MAVEN_VERSION,
      ),
    ).toBe(true);
  });

  test.each([
    'declares-in-build',
    'declares-in-plugin-management',
    'declares-via-property',
  ])('does not pin when the POM mentions the plugin (%s)', (fixture) => {
    expect(
      shouldPinDependencyPlugin(ctx(fixture), false, [], MAVEN_VERSION),
    ).toBe(false);
  });

  test('does not pin when the POM has a parent we cannot read', () => {
    expect(
      shouldPinDependencyPlugin(ctx('has-parent'), false, [], MAVEN_VERSION),
    ).toBe(false);
  });

  test('does not pin when the POM is unparseable', () => {
    expect(
      shouldPinDependencyPlugin(ctx('unparseable'), false, [], MAVEN_VERSION),
    ).toBe(false);
  });

  test('does not pin when the POM file does not exist', () => {
    expect(
      shouldPinDependencyPlugin(
        ctx('no-declaration', 'missing.xml'),
        false,
        [],
        MAVEN_VERSION,
      ),
    ).toBe(false);
  });

  test('does not pin for aggregate scans (module POMs are not inspected)', () => {
    expect(
      shouldPinDependencyPlugin(ctx('no-declaration'), true, [], MAVEN_VERSION),
    ).toBe(false);
  });

  test('does not pin when the Maven version cannot be detected', () => {
    expect(
      shouldPinDependencyPlugin(ctx('no-declaration'), false, [], 'garbage'),
    ).toBe(false);
    expect(
      shouldPinDependencyPlugin(ctx('no-declaration'), false, [], undefined),
    ).toBe(false);
  });

  test('does not pin when user supplied args mention the dependency plugin', () => {
    expect(
      shouldPinDependencyPlugin(
        ctx('no-declaration'),
        false,
        ['-Dmaven-dependency-plugin.version=3.1.2'],
        MAVEN_VERSION,
      ),
    ).toBe(false);
  });
});
