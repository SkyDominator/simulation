---
applyTo: '.github/prompts/4-code/**/*.md'
---

## Code Implementation Cycle

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

## Back-end Coding Guidelines

MUST ALWAYS read the [Back-end Coding Guidelines](../../docs/coding/backend.md).

## Front-end Coding Guidelines

MUST ALWAYS read the [Front-end Coding Guidelines](../../docs/coding/frontend.md).