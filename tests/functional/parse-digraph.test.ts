import * as test from 'tap-only';
import { parseDigraph } from '../../lib/parse-digraph';
import { readFixture } from '../helpers/read';

test('parse valid input to expected string', async (t) => {
  const input = await readFixture('parse-digraph/output-without-labels.txt');
  const result = parseDigraph(input);
  const expected = `digraph "com.snyk.platform:tester-service:jar:4.0.5-SNAPSHOT" {
"com.snyk.platform:tester-service:jar:4.0.5-SNAPSHOT" -> "com.snyk.tester:tester-queue:jar:15.0.0:compile" ;
"com.snyk.platform:tester-service:jar:4.0.5-SNAPSHOT" -> "com.snyk.tester:tester-queue:test-jar:tests:15.0.0:test" ;
}`;
  t.equals(result?.[0], expected);
});

test('parse valid input with env vars to expected string', async (t) => {
  const input = await readFixture(
    'parse-digraph/output-without-labels-with-env-var.txt',
  );
  const result = parseDigraph(input);
  const expected = `digraph "com.snyk.platform:tester-service:jar:\${my.version}" {
"com.snyk.platform:tester-service:jar:\${my.version}" -> "com.snyk.tester:tester-queue:jar:15.0.0:compile" ;
"com.snyk.platform:tester-service:jar:\${my.version}" -> "com.snyk.tester:tester-queue:test-jar:tests:15.0.0:test" ;
}`;
  t.equals(result?.[0], expected);
});
