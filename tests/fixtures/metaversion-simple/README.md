# Metaversion Simple Test Fixture

This fixture demonstrates metaversion resolution in a simple single-module Maven project.

## Behavioral Considerations

### Standard Mode (Single Module)
- Uses `mvn dependency:tree -DoutputType=dot` for base dependency analysis
- **All metaversions**: RELEASE and LATEST versions are resolved to concrete versions
- **Mixed dependencies**: Fixed versions remain unchanged, metaversions are resolved
- **Example resolution**: `resteasy-core:RELEASE` → `resteasy-core:4.0.0.Final`, `commons-lang:LATEST` → `commons-lang:2.6`

### Verbose Mode (`args: ['-Dverbose']`)
- Uses enhanced dependency analysis with metaversion resolution
- **Consistent behavior**: Same resolution logic as standard mode
- **All metaversions**: Resolved to concrete versions regardless of mode

## Dependencies Used

- **resteasy-core:RELEASE** - Resolved to latest release version (e.g., 4.0.0.Final)
- **commons-lang:LATEST** - Resolved to latest available version (e.g., 2.6)  
- **junit:4.13.2** - Fixed version, remains unchanged as control case

## Expected Behavior

1. **Complete resolution**: All metaversions are resolved to concrete versions in the dependency graph
2. **Consistency**: Same metaversion resolves to the same concrete version across the project
3. **Integration**: Resolved versions are properly integrated into the final dependency graph structure

## Usage

Use this fixture to test:
- **Metaversion detection**: Identification of RELEASE and LATEST patterns in dependencies
- **Resolution accuracy**: Correct mapping of metaversions to concrete versions  
- **Graph integration**: Proper incorporation of resolved versions into dependency graphs
- **Mode consistency**: Identical resolution behavior across verbose and standard modes
