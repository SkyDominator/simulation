# Implementation Plan

Use `/.github/copilot-instructions.md` as the Single Source of Truth (SST) and use `/.memo/CE/research/2025-09-16/test-code-research.md` as the snapshot of the current codebase to create an implementation/update plan of the following feature

# Feature to be implemented

1. The test codes for the entire codebase.

# Plan format

* Write and save your plan to `/.memo/CE/plans/2025-09-16/test-code.md`.
* Use the following format and style for the plan.
    * Reference example: `/.memo/CE/example1-plan.md`

# The answers to the open questions in the test-code-research.md

1. Should OTP/SMS flows be mocked or skipped behind an environment flag in CI?
-> mock them behind an environment flag in CI.
2. Is there a preferred coverage reporting service (Codecov, Coveralls)?
-> Codecov
3. Are there regulatory requirements affecting test data (e.g., PII masking)?
-> Yes, PII masking is required.
4. Should load/performance testing be added for simulation services?
-> Yes, it is recommended to add load/performance testing for simulation services.

# General notes

* SSD.md is the single source of truth (SST) for the plan. Go through SSD.md from the beginning to the end, and make sure that every part of the specification regarding the feature is covered in the plan. The current implementation should align with the specifications outlined in SSD.md. 
* If there is any ambiguity or missing details in SSD.md, mark `NEED_VERIFICATION` on the ambiguous parts in the plan file so that I can clarify the direction of next steps.
* Your plan should include the following parts:
    1. A breakdown of tasks and subtasks, including:
        * Frontend tasks
        * Backend tasks
    2. Any dependencies or prerequisites needed before starting the implementation.

# Special notes

1. All the plans (A,B,C,D,E,R,F,...) in the `simulation_service.py` file must be tested.