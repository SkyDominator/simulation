---
mode: agent
tools: ['edit', 'search', 'new', 'GitKraken/*', 'pylance mcp server/*', 'runCommands', 'runTasks', 'context7/*', 'playwright/*', 'usages', 'think', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'extensions', 'todos']
model: Claude Sonnet 4.5
---

# Plan

Create code implementation plan at $PLAN$ by reading $RESEARCH_RESULT$ to solve issues in the codebase.

## The issue statements

```shell
gh issue view 89 --repo SkyDominator/simulation
```

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-89/research-00.md`
$PLAN$: `docs/plan/IS-89/plan-00.md`
$APPROACH$: `Approach 1: Detect and Redirect to External Browser (Recommended)`

(If the file already exists, overwrite it. If the directory and the file do not exist, create them.)

## Tasks

1. Read the issue.
2. Read $RESEARCH_RESULT$.
3. Create $PLAN$ which is driven by $APPROACH$.
    - Take a holistic view of the codebase. Do not stray from the coding guideine.
    - Consider side effects and edge cases.
    - Refer to the following examples for the structure, format, style of the plan:
        - `/docs/examples/example1-plan.md`
        - `docs/plans/test-code/test-plan-01-backend-unit.md`