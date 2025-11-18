---
mode: agent
tools: ['edit', 'search', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'todos']
model: Claude Sonnet 4.5
---

# Research

Investigates and analyzes the codebase to create research artifacts to help solve issues.

The artifacts provide the implementation snapshot of matters preventing going through the entire codebase every time you want to understand the current source codes.

The artifacts must provide the implementation details, context, code map, data flow, and related UX flows.

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-89/research-00.md`:$INIT_RESEARCH_RESULT$

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

## The issue statements

```shell
gh issue view 89 --repo SkyDominator/simulation
```

## The goal of research

The basic goal of this research is to identify source codes:

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

## The research outcome 

- Create $RESEARCH_RESULT$ file to report results.
- Refer to the following examples for the structure, format, style of the report:
    - `/docs/examples/example1-research.md`
    - `/docs/examples/example2-research.md`