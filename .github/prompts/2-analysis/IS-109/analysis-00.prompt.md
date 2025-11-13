---
mode: agent
tools: ['edit/createFile', 'edit/createDirectory', 'edit/editFiles', 'search', 'runCommands/runInTerminal', 'runCommands/getTerminalOutput', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'todos']
model: Claude Sonnet 4.5
---

# Analysis

Investigates and analyzes the codebase to create analysis artifacts to help solve issues.

The artifacts provide the implementation snapshot of matters preventing going through the entire codebase every time you want to understand the current source codes.

The artifacts must provide the implementation details, context, code map, data flow, or the related UX flows if applicable.

## Mappings

$INSTRUCTIONS$: `.github/instructions/2-analysis.instructions.md`
$ANALYSIS_REPORT$: `docs/analysis/IS-62/IS-109/analysis-00.md`

(If the file already exists, overwrite it. If the directory and the file do not exist, create them.)

## pre-requisites

Check status.

```shell
gh auth status
```

Log in to GitHub CLI if not logged in.:

```shell
# Use `SIMULATION_READ_ISSUE` (fine grained token for Github issue read-only) in the environment variables to log in.
gh auth login
```

## Tasks

```shell
gh issue view 109 --repo SkyDominator/simulation
```

$ANALYSIS_REPORT$ is the analysis report you need to create.

The analysis should includes:

1. Root cause codes
    1. Code map
        * `file path:line number` format
    2. Data flow
    3. Code execution flow
2. Related codes (will or may impact or be impacted by the root cause codes)
    1. Code map
        * `file path:line number` format
    2. Data flow
    3. Code execution flow

## The analysis report 

- Create $ANALYSIS_REPORT$ file to report results following $INSTRUCTIONS$.
- Refer to the following example for the structure and format of the report:
    - `../../../../docs/analysis/IS-62/analysis-02.md`