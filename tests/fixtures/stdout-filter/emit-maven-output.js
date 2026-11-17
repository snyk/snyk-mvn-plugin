// Prints Maven-like output for sub-process tests.
// usage: node emit-maven-output.js <pom-error|noise-only|success> <noiseLines>
const [mode, noise] = process.argv.slice(2);
const out = [];
if (mode === 'pom-error') {
  out.push(
    '[ERROR] [ERROR] Some problems were encountered while processing the POMs:',
  );
  out.push('[FATAL] Non-parseable POM /repo/m1/pom.xml: end tag name mismatch');
  out.push(' @ ');
}
for (let i = 0; i < Number(noise); i++) {
  out.push(`[DEBUG] filler line ${i} with some padding to make it longer`);
}
if (mode === 'success') {
  out.push(
    '[INFO] --- maven-dependency-plugin:3.7.0:tree (default-cli) @ a ---',
  );
  out.push('[INFO] digraph "g:a:jar:1" {');
  out.push('[INFO] \t"g:a:jar:1" -> "g:b:jar:2:compile" ;');
  out.push('[INFO]  }');
}
out.push(
  mode === 'pom-error' ? '[INFO] BUILD FAILURE' : '[INFO] BUILD SUCCESS',
);
process.stdout.write(out.join('\n') + '\n', () => {
  process.exitCode = mode === 'pom-error' ? 1 : 0;
});
