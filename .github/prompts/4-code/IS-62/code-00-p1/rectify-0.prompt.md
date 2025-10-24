---
mode: agent
tools: ['edit', 'search', 'runCommands', 'runTasks', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

## Mappings

$INSTRUCTIONS$: `.github/instructions/4-code.instructions.md`

## Tasks

In the last session we did:

1. I requested `../code-00-p1/code-0.prompt.md`
2. You responded with the result: `76f16960ae92e85ea65da87a454707ab0aa02e23` (commit hash)
3. We verified the result and found the followings:

```markdown
On `base.ts`, the `simulationSeed` re-runs the member login work directly on `{ page }`. Per Phase 1, it must compose `memberSession` (should be injected), then inject the deterministic simulation mocks and draft state on top of the already-initialized member session.
```

Based on the findings above, rectify codes.

## Notes

```shell
git diff --name-only {commit_hash}^ {commit_hash}
```

Use this command to read the changes made in each file in each commit:

```shell
git diff {commit_hash}^ {commit_hash} -- {file_path}
```

Follow the $INSTRUCTIONS$ strictly.