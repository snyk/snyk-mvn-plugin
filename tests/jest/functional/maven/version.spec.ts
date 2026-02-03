import {
  selectPluginVersion,
  MAVEN_DEPENDENCY_PLUGIN_VERSION,
  MAVEN_DEPENDENCY_PLUGIN_VERSION_LEGACY,
} from '../../../../lib/maven/version';

describe('selectPluginVersion', () => {
  it('should return 3.9.0 for Maven 3.9.6', () => {
    const result = selectPluginVersion(
      'Apache Maven 3.9.6 (bc0240f3c744dd6b6ec2920b3cd08dcc295161ae)',
    );
    expect(result).toBe(MAVEN_DEPENDENCY_PLUGIN_VERSION);
  });

  it('should return 3.9.0 for Maven 3.6.3 (minimum supported)', () => {
    const result = selectPluginVersion(
      'Apache Maven 3.6.3 (cecedd343002696d0abb50b32b541b8a6ba2883f)',
    );
    expect(result).toBe(MAVEN_DEPENDENCY_PLUGIN_VERSION);
  });

  it('should return 3.6.1 for Maven 3.6.2 (below minimum)', () => {
    const result = selectPluginVersion(
      'Apache Maven 3.6.2 (40f52333136460af0dc0d7232c0dc0bcf0d9e117)',
    );
    expect(result).toBe(MAVEN_DEPENDENCY_PLUGIN_VERSION_LEGACY);
  });

  it('should return 3.6.1 for Maven 3.5.0', () => {
    const result = selectPluginVersion(
      'Apache Maven 3.5.0 (ff8f5e7444045639af65f6095c62210b5713f426)',
    );
    expect(result).toBe(MAVEN_DEPENDENCY_PLUGIN_VERSION_LEGACY);
  });

  it('should return 3.6.1 for unparseable version string', () => {
    const result = selectPluginVersion('unknown version');
    expect(result).toBe(MAVEN_DEPENDENCY_PLUGIN_VERSION_LEGACY);
  });

  it('should return 3.9.0 for Maven 4.0.0', () => {
    const result = selectPluginVersion(
      'Apache Maven 4.0.0 (aa8a1c7b8cde7fd80f9ebc6ec2d1d5f4e2bbcd26)',
    );
    expect(result).toBe(MAVEN_DEPENDENCY_PLUGIN_VERSION);
  });
});
