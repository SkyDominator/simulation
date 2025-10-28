---
mode: agent
tools: ['search', 'pylance mcp server/pylanceDocuments', 'pylance mcp server/pylanceFileSyntaxErrors', 'pylance mcp server/pylanceImports', 'pylance mcp server/pylanceInstalledTopLevelModules', 'pylance mcp server/pylanceInvokeRefactoring', 'pylance mcp server/pylancePythonEnvironments', 'pylance mcp server/pylanceSettings', 'pylance mcp server/pylanceSyntaxErrors', 'pylance mcp server/pylanceWorkspaceRoots', 'pylance mcp server/pylanceWorkspaceUserFiles', 'context7/*', 'usages', 'think', 'problems', 'changes', 'fetch', 'ms-python.python/getPythonEnvironmentInfo', 'ms-python.python/getPythonExecutableCommand', 'ms-python.python/installPythonPackage', 'todos']
model: Claude Sonnet 4.5
---

# Coding Cycle Manager

The coding process basically consists of 2 things: the initial code generation and the 2-stages loop (Verify-Rectify Cycle):

1. Initial Code Generation
2. Verify Code Results
3. Rectify Code Based on Verification Results
    * Go back to Step 2 until no issues are found in Step 2.

The process can be expanded as follows:

---

(Initial Code Generation)
1. Request: Code
2. Response: Code Result

---

(Loop: Verify)
3. Request: Verify Code Result
4. Response: Verification Findings

(Loop: Rectify)
5. Request: Rectify Code Based on Findings
6. Response: Rectified Code Result

---

If there are too many changed files or code changes in Initial Code Generation, we split them into multiple sub-tasks (e.g., Rectify-0, Rectify-1, etc.) to make each context window manageable for you.

---

(Initial Code Generation)
1. Request: Code
2. Response: Code Result-0, Code Result-1, Code Result-2, ...

---
(SUBTASK-0)
(Code Result-0 Loop: Verify)
3. Request: Verify Code Result
4. Response: Verification Findings

(Code Result-0 Loop: Rectify)
5. Request: Rectify Code Based on Findings
6. Response: Rectified Code Result

---
(SUBTASK-1)
(Code Result-1 Loop: Verify)
3. Request: Verify Code Result
4. Response: Verification Findings

(Code Result-1 Loop: Rectify)
5. Request: Rectify Code Based on Findings
6. Response: Rectified Code Result

---
(SUBTASK-2)
(Code Result-2 Loop: Verify)
3. Request: Verify Code Result
4. Response: Verification Findings

(Code Result-2 Loop: Rectify)
5. Request: Rectify Code Based on Findings
6. Response: Rectified Code Result

--

...

--

## Mappings

* $CODE$: `../../code-00-p2/code.prompt.md`
* $VERIFY$: `../sub-0/verify.prompt.md`
* $RECTIFY$: `../sub-0/rectify.prompt.md`

## Sub-task Information

* $SUBTASK_ID$: `0`
* $TASK_TARGETS$ (files to verify for this subtask):
    * `src/frontend/e2e/utils/journey-actions.ts`
    * `src/frontend/e2e/utils/apiMocks/playwright.ts`
    * `src/frontend/e2e/utils/auth-helpers.ts`
    * `src/frontend/e2e/utils/test-helpers.ts`

## History

So far during the past Chat sessions, we did:

1. $CODE$
2. Response
    * `commit_hash`
        1. `d6911405734a06508b47dc067b6a89dcbbee213b`
        2. `f391851eb2f84b3e4da585ccdefe8e7f57cdfc37`
3. Start subtask: $SUBTASK_ID$
    1. $VERIFY$
    2. Response
        * auth-helpers.ts (completeOnboardingFlow): the delegate now just forwards to journey-actions.completeOnboardingFlow and no longer seeds a Supabase session token before clicking the OAuth button. In E2E mode the LoginPage expects that token to be injected (see AuthContext’s e2e:oauth-click handler); without it the flow never reaches main-page, regressing the legacy helper the plan asked us to preserve.
        * Let journey-actions.completeOnboardingFlow accept an optional hook (for example { onBeforeOAuth?: (page) => Promise<void> }) that runs right after it waits for the login buttons and before it clicks Google/Kakao. Then auth-helpers.completeOnboardingFlow can pass async () => { await initE2EMode(page); await setAuthToken(page, createMemberAuthToken()); }. Keeps the action helper pure, reuses the new split helpers, and restores the legacy token injection you prefer.

## Task

Do the next step.

## Notes for Future Steps (FOR LATER REFERENCE ONLY)

* journey-actions.ts: the new simulation-table helpers are wired to data-test ids that don’t exist. The UI exposes data-testid="results-${id}", edit-${id}, delete-${id}, simulation-checkbox-${id}, and memo-chip-${id}, with the memo modal lacking memo-input/memo-save test ids altogether (see SimulationTable.tsx and MemoModal.tsx). The current selectors (view-results-*, edit-simulation-*, delete-simulation-*, select-simulation-*, memo-*) will never match, so these helpers can’t be used as written.