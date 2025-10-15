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

## Tasks

DO the following tasks:

1. Read $RESEARCH_RESULT$ and $PLAN$ carefully.
2. Modify codebase following the $PLAN$. MUST go through ALL Phases in the plan. Implement only what are described in the $PLAN$. NO MORE, NO LESS.
3. Continuously & thoroughly iterate on a review-and-self-correct loop until the $PLAN$ is fully and accurately implemented.
4. Stop and wait for user order.

## Notes

If the $PLAN$ is ambiguous, incomplete or problematic:

1. First, consult the $RESEARCH_RESULT$ for more information and try to suggest alternative solutions. If some solutions come out after consulting, update the $PLAN$ accordingly and continue implementation.
2. If no solutions are found or still unclear about something, stop and ask for clarification instead of making assumptions.

DO NOT:

1. Create any report documents.
2. Stary to solve other issues not mentioned in the $PLAN$. If other issues are found, stop and report and wait for user order.
3. Refactor the codebase beyond what is necessary to solve the mentioned issues in the $PLAN$.
