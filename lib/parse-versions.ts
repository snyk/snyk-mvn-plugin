export function parseVersions(text: string): {
  javaVersion: string;
  mavenVersion: string;
} {
  // AppVeyor (at least) doesn't use \n\r, therefore os.EOL doesn't work
  const data = text.split('\n');
  const mavenVersion = data[0];
  const javaVersion =
    data.find((line) => line.startsWith('Java version:')) || '';

  return { javaVersion, mavenVersion };
}
