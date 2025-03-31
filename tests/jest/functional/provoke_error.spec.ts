import { parse } from "../../../lib/parse";

test('ddddd', async () => {
  const result = `Command: mvn org.apache.maven.plugins:maven-dependency-plugin:3.6.1:tree -DoutputType=dot --batch-mode --non-recursive --file="pom.xml" -Dverbose > mvntree.txt
hi there
`;
  const verboseEnabled = true;
  const options = {
    dev: false
  };

  const parseResult = parse(result, options.dev, verboseEnabled);

  expect(parseResult).toBeDefined();
});
