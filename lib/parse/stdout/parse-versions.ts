export function parseVersions(text: string): {
  javaVersion: string;
  mavenFullVersion: string;
  mavenVersion: string;
} {
  // AppVeyor (at least) doesn't use \n\r, therefore os.EOL doesn't work
  const data = text.split('\n');
  const mavenFullVersion = data[0];
  const mavenVersion = /.*(\d+\.\d+\.\d+).*/.exec(mavenFullVersion)?.pop() || '';
  const javaVersion =
    data.find((line) => line.startsWith('Java version:')) || '';

  return { javaVersion, mavenFullVersion, mavenVersion };
}
