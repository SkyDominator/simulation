---
mode: agent
tools: ['edit', 'search', 'runCommands', 'runTasks', 'pylance mcp server/*', 'context7/*', 'usages', 'think', 'problems', 'changes', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'todos']
model: Claude Sonnet 4.5
---

# Analysis

Investigates and analyzes the codebase to create analysis artifacts to help solve issues.

The artifacts provide the implementation snapshot of matters preventing going through the entire codebase every time you want to understand the current source codes.

The artifacts must provide the implementation details, context, code map, data flow, and related UX flows.

## Mappings

$RESEARCH_REPORT$: `docs/research/IS-62/IS-93/research-00.md`
$ANALYSIS_REPORT$: `docs/analysis/IS-62/IS-92/analysis-00.md`

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
gh issue view 92 --repo SkyDominator/simulation
```

$RESEARCH_REPORT$ is the research report you need to read in.
$ANALYSIS_REPORT$ is the analysis report you need to create.

I will go with the Architecture 1 approach in the $RESEARCH_REPORT$.

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

- Create $ANALYSIS_REPORT$ file to report results.
- Refer to the following examples for the structure, format, style of the report:
    - `../../../../docs/research/IS-89/research-01.md`