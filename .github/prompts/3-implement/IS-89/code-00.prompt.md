---
mode: agent
tools: ['edit', 'search', 'new', 'GitKraken/*', 'pylance mcp server/*', 'runCommands', 'runTasks', 'context7/*', 'playwright/*', 'usages', 'think', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'extensions', 'todos']
model: Claude Sonnet 4.5
---

# Implement

## Overview

Implement codes by following the $PLAN$.

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-89/research-00.md`
$PLAN$: `docs/plan/IS-89/plan-00.md`
$APPROACH$: `Approach 1: Detect and Redirect to External Browser (Recommended)`

## Notes

- Only implement what is described in the $PLAN$. NO MORE, NO LESS.
- If the $PLAN$ is ambiguous, incomplete or problematic:
    1. First, consult the $RESEARCH_RESULT$ for more information. If you fall into some conclusions after consulting, update the $PLAN$ accordingly and continue implementation.
    2. If you didn't make any conclusions, stop and ask for clarification instead of making assumptions.
- Continuously & thoroughly iterate on a review-and-self-correct loop until the $PLAN$ is fully and accurately implemented.
- Do not create any report documents after implementation.

## Tasks

Do the following tasks:

1. Read $RESEARCH_RESULT$ and $PLAN$ carefully.
2. Modify codebase STRICTLY following the $PLAN$.
3. Continuously iterate on a review-and-self-correct loop until the criteria are met:
    - Code changes STRICTLY follow the $PLAN$.
    - Code changes are tested and verified to work as intended.
    - Code changes do not introduce new issues or regressions.
    - Code changes follow the provided coding guidelines.
4. Stop and wait for user order.

Do not:

1. Create any report documents.
2. Stary to solve other issues not mentioned in the $PLAN$. If other issues are found, they will be fixed in subsequent iterations (research, planning, implementation).
3. Refactor the codebase beyond what is necessary to solve the mentioned issues in the $PLAN$. Refactoring will be handled in separate iterations if needed.