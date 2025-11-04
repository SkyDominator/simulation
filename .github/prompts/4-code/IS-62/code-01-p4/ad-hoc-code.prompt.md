---
mode: agent
tools: ['edit', 'search', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

The messages ("가입 허용 명단에 없는 사용자입니다.", for example) are spread over the following files:

`src/frontend/src/test/mocks/api.ts, src/frontend/e2e/fixtures/test-data.ts, src/frontend/test/shared/fixtures.ts`

Create a single source of truth for messages used across ALL frontend tests and ALL frontend components. I need to control UI messages from a single place and let the both all production codes and all test codes pull messages from there.

Follow these steps:

1. First, pick a file to be the single source of truth for test messages. Justify your choice.
2. Next, outline the steps needed to refactor the codebase so that all tests pull test messages from this single source of truth.
3. Finally, implement the refactoring by modifying the codebase accordingly. The basis of the actual texts of the messages should be the existing messages in the frontend production codes implemented.

