---
mode: agent
tools: ['edit', 'search', 'new', 'GitKraken/*', 'pylance mcp server/*', 'runCommands', 'runTasks', 'context7/*', 'playwright/*', 'usages', 'think', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'extensions', 'todos']
model: Claude Sonnet 4.5
---

# Test & Debug

## Overview

The codebase has been changed. Run test codes and check all tests pass except E2E tests. If not, iterate self-correction-and-review loop until they pass.

## The changes to the codebase

The commit hashes.

* `b0ea4651c46f0d161e057d99f118e8e25b690d7f`
* `04de82ae667f01b03845af60a2ea4bf19b6e58ee`

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-89/research-00.md`
$PLAN$: `docs/plan/IS-89/plan-00.md`

## Tasks

Check all tests pass except the frontend E2E tests. If not, iterate self-correction-and-review loop until they passes. Consult the $PLAN$ and $RESEARCH_RESULT$ files to continue the loop. If you think the issues lie the codebase itself, not the test codes, stop and report me.