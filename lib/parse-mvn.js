module.exports = parseTree;

var packageFormatVersion = 'mvn:0.0.1';
var newline = /[\r\n]+/g;
var logLabel = /^\[\w+\]\s*/gm;
var digraph = /digraph([\s\S]*?)\}/g;

// Parse the output from 'mvn dependency:tree -DoutputType=dot'
function parseTree(text, withDev) {
  text = text.replace(logLabel, '');
  try {
    return {
      ok: true,
      data: getRootProject(text, withDev),
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message,
      error: error,
    };
  }
}

function getRootProject(text, withDev) {
  var projects = text.match(digraph);
  if (!projects) {
    throw new Error('Error: Cannot find dependency information. ' +
                    'Please make sure that Apache Maven Dependency Plugin ' +
                    'version 2.2 or above is installed.');
  }
  var root = getProject(projects[0], null, withDev);
  // Add any subsequent projects to the root as dependencies
  for (var i = 1; i < projects.length; i++) {
    var project = getProject(projects[i], root, withDev);
    if (project) {
      root.dependencies[project.name] = project;
    }
  }
  root.packageFormatVersion = packageFormatVersion;
  return root;
}

function getProject(projectDump, parent, withDev) {
  var lines = projectDump.split(newline);
  var identity = dequote(lines[0]);
  var deps = {};
  for (var i = 1; i < lines.length - 1; i++) {
    var line = lines[i];
    var nodes = line.trim().split('->');
    var source = dequote(nodes[0]);
    var target = dequote(nodes[1]);
    deps[source] = deps[source] || [];
    deps[source].push(target);
  }
  return assemblePackage(identity, deps, parent, withDev);
}

function assemblePackage(source, projectDeps, parent, withDev) {
  var sourcePackage = createPackage(source, parent);
  if (sourcePackage.scope === 'test' && !withDev) {
    // skip a test dependency if it's not asked for
    return null;
  }
  var sourceDeps = projectDeps[source];
  if (sourceDeps) {
    for (var i = 0; i < sourceDeps.length; i++) {
      var pkg = assemblePackage(
        sourceDeps[i], projectDeps, sourcePackage, withDev);
      if (pkg) {
        sourcePackage.dependencies[pkg.name] = pkg;
      }
    }
  }
  return sourcePackage;
}

function createPackage(pkgStr, parent) {
  var range = getConstraint(pkgStr);

  if (range) {
    pkgStr = pkgStr.substring(0, pkgStr.indexOf(' '));
  }

  var parts = pkgStr.split(':');
  var result = {
    groupId: parts[0],
    artifactId: parts[1],
    packaging: parts[2],
    version: parts[3],
    name: parts[0] + ':' + parts[1],
    dependencies: {},
  };

  if (parts.length >= 5) {
    result.scope = parts[parts.length - 1];
    result.version = parts[parts.length - 2];
  }

  if (range) {
    result.dep = range;
  }

  var selfPkg = result.groupId + ':' + result.artifactId + '@' + result.version;

  result.from = parent ?
    parent.from.concat(selfPkg) :
    [selfPkg];

  return result;
}


function dequote(str) {
  return str.slice(str.indexOf('"') + 1, str.lastIndexOf('"'));
}

function getConstraint(str) {
  var index = str.indexOf('selected from constraint');
  if (index === -1) {
    return null;
  }
  return str.slice(index + 25, str.lastIndexOf(')'));
}
