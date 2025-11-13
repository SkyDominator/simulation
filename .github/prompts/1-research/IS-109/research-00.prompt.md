---
mode: agent
tools: ['edit/createFile', 'edit/createDirectory', 'edit/editFiles', 'search', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'todos']
model: Claude Sonnet 4.5
---

# Research

Do research and create a research artifact.

## Mappings

$INSTRUCTIONS$: `.github/instructions/1-research.instructions.md`
$RESEARCH_RESULT$: `docs/research/IS-109/research-00.md`

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

## The research task

```shell
gh issue view 109 --repo SkyDominator/simulation
```

## The research report

- Create $RESEARCH_RESULT$ file to report results following $INSTRUCTIONS$.
- Refer to the following examples for the structure, format, style of the report:
    - `../../../../docs/research/IS-62/IS-93/research-00.md`
    - If the given example format is inapplicable for some contents, create a suitable format for them.
- Must include:
    1. Related codes
        1. Code map
            * `file path:line number` format
        2. Data flow
        3. Code execution flow