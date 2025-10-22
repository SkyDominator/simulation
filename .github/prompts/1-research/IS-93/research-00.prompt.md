---
mode: agent
tools: ['edit', 'search', 'runCommands', 'runTasks', 'pylance mcp server/*', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'githubRepo', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'todos']
model: Claude Sonnet 4.5
---

# Research

Do research and create a research artifact.

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-93/research-00.md`

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
gh issue view 93 --repo SkyDominator/simulation
```

## The research report

- Create $RESEARCH_RESULT$ file to report results.
- Refer to the following examples for the structure, format, style of the report:
    - `../../../../docs/research/IS-89/research-01.md`
    - If the given example format is inapplicable for some contents, create a suitable format for them.
- Must include:
    1. Related codes
        1. Code map
            * `file path:line number` format
        2. Data flow
        3. Code execution flow