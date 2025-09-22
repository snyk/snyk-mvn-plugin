# Metaversion Aggregate Test Fixture

This fixture demonstrates the metaversion resolution problem in a multi-module Maven aggregate project.

## Problem Being Tested

When running `mvn dependency:tree -DoutputType=dot` on aggregate projects, metaversions like `RELEASE` and `LATEST` in both parent dependency management and module-specific dependencies may not show their resolved versions.

## Project Structure

```
metaversion-aggregate/
├── pom.xml (parent with dependencyManagement using metaversions)
├── module-core/
│   └── pom.xml (direct metaversion dependencies)
└── module-web/
    └── pom.xml (inherited and direct metaversions)
```

## Dependencies Used

### Parent `dependencyManagement`:
- **spring-core:RELEASE** - Managed version for modules
- **commons-collections4:LATEST** - Managed version for modules

### Module-Core:
- **httpclient:RELEASE** - Direct metaversion dependency
- **spring-core** - Inherits RELEASE from parent
- **jackson-core:LATEST** - Direct metaversion dependency

### Module-Web:
- **module-core** - Sibling module dependency  
- **slf4j-api:LATEST** - Direct metaversion dependency
- **commons-collections4** - Inherits LATEST from parent
- **javax.servlet-api:RELEASE** - Direct metaversion dependency

## Behavioral Considerations

### Non-Verbose Mode (`mavenAggregateProject: true`)
- Uses `mvn test-compile dependency:tree` approach for base dependency resolution
- **All dependencies**: Metaversions (RELEASE, LATEST) are resolved to concrete versions
- **Critical edge case**: Transitive dependencies from inter-module dependencies are properly resolved, ensuring consistent versions across the dependency graph
- **Example**: `httpclient:RELEASE` → `httpclient:4.5.14`, `spring-core:RELEASE` → `spring-core:7.0.0-M8`

### Verbose Mode (`mavenAggregateProject: true, args: ['-Dverbose']`)
- Uses `org.apache.maven.plugins:maven-dependency-plugin:3.6.1:tree` approach for enhanced dependency analysis
- **All dependencies**: Metaversions are resolved through additional `dependency:resolve` execution
- **Consistent resolution**: Same metaversions resolve to identical concrete versions across all modules

### Expected Behavior

- **Version consistency**: The same dependency with the same metaversion resolves to identical concrete versions across all modules
- **Complete resolution**: Both direct and transitive metaversions are resolved regardless of their source (parent management, inter-module, or direct declaration)
- **Edge case handling**: Complex scenarios like transitive metaversions from sibling modules are properly resolved

## Notes

- **Inter-module dependency warnings**: When running Maven commands on this fixture without first building the modules (`mvn install`), you may see warnings like `"The POM for io.snyk.example:module-core:jar:1.0-SNAPSHOT is missing"`. This is expected and normal - Maven can't find the artifact in the local repository yet, but the dependency tree analysis will still work correctly.

- **test-compile requirement**: For aggregate projects, the implementation uses `mvn test-compile dependency:resolve` (not just `dependency:resolve`) to ensure Maven's reactor can properly resolve inter-module dependencies. Note that `test-compile` causes direct metaversions to be resolved in Maven's output, but transitive metaversions remain unresolved. Additional metaversion resolution logic handles cases that Maven's built-in resolution doesn't cover.

- **Realistic testing**: This fixture intentionally includes inter-module dependencies to mirror real-world aggregate projects where modules depend on each other. This tests the critical edge case handling for transitive metaversions from sibling modules.

## Key Test Scenarios

### Direct Dependencies (Module-Level)
- **module-core**: `httpclient:RELEASE`, `spring-core:RELEASE`, `jackson-core:LATEST`
- **module-web**: `slf4j-api:LATEST`, `servlet-api:RELEASE`

### Inherited Dependencies (From Parent)
- **spring-core:RELEASE** (managed in parent `dependencyManagement`)  
- **commons-collections4:LATEST** (managed in parent `dependencyManagement`)

### Transitive Dependencies (Critical Edge Case)
- **module-web** includes transitive deps from **module-core**
- Metaversions: `httpclient:RELEASE`, `spring-core:RELEASE`, `jackson-core:LATEST`
- **Resolved behavior**: These are resolved to concrete versions matching module-core's resolution, ensuring consistency across the dependency graph

## Usage

Use this fixture to test:
- **Non-verbose aggregate**: Complete metaversion resolution including critical transitive edge cases
- **Verbose aggregate**: Comprehensive metaversion resolution across all dependency types
- **Dependency management inheritance**: Parent-managed metaversion resolution and consistency  
- **Cross-module dependencies**: Inter-module metaversion consistency and resolution
- **Complex scenarios**: Multi-layered metaversion resolution with mixed dependency sources
