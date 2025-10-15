---
mode: agent
tools: ['edit', 'search', 'new', 'GitKraken/*', 'pylance mcp server/*', 'runCommands', 'runTasks', 'context7/*', 'playwright/*', 'usages', 'think', 'problems', 'changes', 'testFailure', 'openSimpleBrowser', 'fetch', 'githubRepo', 'github.vscode-pull-request-github/copilotCodingAgent', 'github.vscode-pull-request-github/activePullRequest', 'github.vscode-pull-request-github/openPullRequest', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'ms-python.python/configurePythonEnvironment', 'extensions', 'todos']
model: Claude Sonnet 4.5
---

# Test & Debug

## Overview

One or more test fail. Iterate self-correction-and-review loop until they passes.

## Failed Tests

```shell
 FAIL  src/test/integration/UserFlowIntegration.test.tsx > Critical User Path Integration Tests > INT-001: Complete Onboarding Flow (OTP → Auth → First Simulation) > should validate OAuth integration after OTP completion
TypeError: Cannot read properties of undefined (reading 'matches')
 ❯ node_modules/@mui/system/useMediaQuery/useMediaQuery.js:86:34
 ❯ mountSyncExternalStore node_modules/react-dom/cjs/react-dom-client.development.js:5989:24
 ❯ Object.useSyncExternalStore node_modules/react-dom/cjs/react-dom-client.development.js:22977:16
 ❯ process.env.NODE_ENV.exports.useSyncExternalStore node_modules/react/cjs/react.development.js:1228:34
 ❯ useMediaQueryNew node_modules/@mui/system/useMediaQuery/useMediaQuery.js:94:17
 ❯ Proxy.useMediaQuery node_modules/@mui/system/useMediaQuery/useMediaQuery.js:124:17
 ❯ EmbeddedBrowserWarningModal src/components/EmbeddedBrowserWarningModal.tsx:38:20
     36| > = ({ open, onClose, browserName }) => {
     37|   const theme = useTheme();
     38|   const isMobile = useMediaQuery(theme.breakpoints.down("md"));
       |                    ^
     39|   const detectedBrowser = browserName || getBrowserName();
     40|
 ❯ Object.react-stack-bottom-frame node_modules/react-dom/cjs/react-dom-client.development.js:23863:20
 ❯ renderWithHooks node_modules/react-dom/cjs/react-dom-client.development.js:5529:22
 ❯ updateFunctionComponent node_modules/react-dom/cjs/react-dom-client.development.js:8897:19
```

## Mappings

$RESEARCH_RESULT$: `docs/research/IS-89/research-00.md`
$PLAN$: `docs/plan/IS-89/plan-00.md`

## Tasks

Iterate self-correction-and-review loop until the tests pass. Consult the $PLAN$ and $RESEARCH_RESULT$ files to continue the loop. If you think the issues lie the codebase itself, not the test codes, stop and report me.