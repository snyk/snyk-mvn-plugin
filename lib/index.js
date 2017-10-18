var parse = require('./parse-mvn');
var fs = require('fs');
var path = require('path');
var subProcess = require('./sub-process');

module.exports = {
  inspect: inspect,
};

module.exports.__tests = {
  buildArgs: buildArgs,
};

function inspect(root, targetFile, options) {
  if (!options) { options = { dev: false }; }
  return subProcess.execute(
    'mvn',
    buildArgs(root, targetFile, options.args),
    { cwd: root }
  )
  .then(function (result) {
    var parseResult = {};
    try {
      parseResult = parse(result, options.dev);
    } catch (error) {
      console.log('\nAn unknown error occurred. ' +
      'Please include the trace below when reporting to Snyk:', error, '\n');
      return Promise.reject('');
    }
    if (parseResult.ok) {
      return {
        plugin: {
          name: 'bundled:maven',
          runtime: 'unknown',
        },
        package: parseResult.data,
      };
    }
    return Promise.reject(parseResult.message ||
      'An internal error has occured. Please contact Snyk for support.');
  });
}

function buildArgs(root, targetFile, mavenArgs) {
  // Requires Maven >= 2.2
  var args = ['dependency:tree', '-DoutputType=dot'];
  if (targetFile) {
    if (!fs.existsSync(path.resolve(root, targetFile))) {
      throw new Error('File not found: ' + targetFile);
    }
    args.push('--file=' + targetFile);
  }
  if (mavenArgs) {
    args = args.concat(mavenArgs);
  }
  return args;
}
