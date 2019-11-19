import * as test from 'tap-only';
import { isJar } from '../../lib/jar';

test('detects jar files', (t) => {
  const jarPaths = [
    'mvn-app-1.0-SNAPSHOT.jar',
    'mvn-app-1.0-SNAPSHOT.war',
    'mvn-app-1.0-SNAPSHOT.zip',
  ];
  for (const path of jarPaths) {
    t.ok(isJar(path), path);
  }
  t.end();
});

test('ignores non jar files', (t) => {
  const jarPaths = [
    'mvn-app-1.0-SNAPSHOTjar',
    'mvn-app-1.0-SNAPSHOT.txt',
    'mvn-app-1.0-SNAPSHOT.jzip',
  ];
  for (const path of jarPaths) {
    t.ok(!isJar(path), path);
  }
  t.end();
});
