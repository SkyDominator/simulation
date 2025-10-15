---
mode: agent
tools: ['edit', 'search', 'new', 'GitKraken/*', 'pylance mcp server/*', 'runCommands', 'runTasks', 'context7/*', 'playwright/*', 'usages', 'think', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'extensions', 'todos']
model: Claude Sonnet 4.5
---

# Clean Up

## Overview

Wrap up solving the issue by completing documentations.

## The final changes to the codebase

The commit hashes.

* `b0ea4651c46f0d161e057d99f118e8e25b690d7f`
* `04de82ae667f01b03845af60a2ea4bf19b6e58ee`
* `e063f12652bba410b62b352663e40f239d94915b`

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-89/research-00.md`
$PLAN$: `docs/plan/IS-89/plan-00.md`

## Tasks

1. Read $RESEARCH_RESULT$ and $PLAN$ to understand the context of issues.
2. Read the final changes by commit hashes above to understand how the issues were solved.
3. Update documentation to reflect the changes.
    * Test code debugging configurations: `.vscode/launch.json`
    * All docs linked in `.github/copilot-instructions.md`
4. (Optional) Create user-facing help document.
    * Create user guide under `docs/user/` if necessary.

## Notes

Do not create summary report files.