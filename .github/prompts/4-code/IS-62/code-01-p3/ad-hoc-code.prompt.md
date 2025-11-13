---
mode: agent
tools: ['edit', 'search', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

You said:

```markdown
1. src/frontend/e2e/specs/pre-auth-flow.spec.ts:43-48 – After a successful whitelist submission the UI swaps to OtpVerificationPage, so the “환영합니다!” heading and whitelist-form element disappear. The new test still expects both to remain visible, guaranteeing a failure instead of validating the intended form toggle.

2. src/frontend/e2e/specs/pre-auth-flow.spec.ts:49-53 – The countdown assertion assumes a bare MM:SS string appears immediately, but the OTP screen only renders data-testid="otp-timer" once its internal countdown state is set (the whitelist step never sets it). As written the expectation will never pass, so the “countdown presence after OTP request” requirement isn’t actually satisfied.
```

Do:

1. Correct. Both of them should appear when the user just landed the app, not after passing white list check with the valid name and phone number. We need to re-locate them on such a step like `onWhitelist` that tests the `WhitelistCheckPage` of `src/frontend/src/pages/WhitelistCheckPage.tsx`.

2. Correct. Change the test codes to meet the expectation, for now. We will back to fix the frontend codes about this timer rendering issue.