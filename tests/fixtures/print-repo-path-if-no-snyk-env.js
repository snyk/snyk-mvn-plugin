// Prints this directory when no SNYK_* variable is visible to the child, otherwise a path that does not exist.
const leaked = Object.keys(process.env).some((key) => /^snyk_/i.test(key));
process.stdout.write(leaked ? '/nonexistent/snyk-env-leaked' : __dirname);
