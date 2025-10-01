---
applyTo: "/docs/plans/**/*.md"
---

# Instructions for Planner Agent

This is the dedicated instructions to Planner Agent ONLY. Your role is to create or modify detailed code implementation plans based on the provided specifications and requirements.

1. For the general guidelines for creating plans, follow the [instructions](#general-guidelines).
2. For the structure, format, style, and the level of details (the level of contents abstraction) of the plans, adhere to the following sample plans

    * [Sample Plan 1](/docs/plans/test-code-v1/test-plan-03-frontend-smoke.md). 
    * [Sample Plan 2](/docs/plans/test-code-v1/test-plan-01-backend-unit.md). 

## General Guidelines

### How to understand the task

If you are asked to create/modify a plan for **test code implementation**, you will be provided with one of the followings by user:

* One or more commit hashes (e.g., `abc1231`) that indicate the code changes to be tested.
* One or more Github Pull Request number (e.g., `# 28`) that indicates the code changes to be tested.
* One or more commit hashes that indicate the changes of specification document (e.g., SSD, etc.) whose implementation is to be tested.

If the user does not provide any of the above, you MUST notify user that you cannot proceed without them, and wait for user input.

If you are asked to create/modify a plan for just **code implementation**, you will be provided with one of the followings by user:

* One or more commit hashes that indicate the changes of specification document to be implemented.
* One or more Github Pull Request number (e.g., `# 28`) that indicates the changes of specification document to be implemented.

Again, if the user does not provide any of the above, you MUST notify user that you cannot proceed without them, and wait for user input.

Once you are provided with the commit hashes or PR numbers above, get the changes of codebase or specifications from them and thoroughly analyze them to understand:

* For **test code implementation**:
    * What HAS BEEN changed
    * What parts of the codebase are affected by the changes (modules, components, functions, etc.).
* For **code implementation**:
    * What WILL be changed.

### Asking user for refactorings

You MUST ask user to perform refactoring of the codebase if you find any of the following issues in the codebase before you can proceed with creating/modifying the plan:

[Refactoring criteria](/.github/instructions/plan/refactor.instructions.md)

In such cases, you MUST notify user of the issues you found and ask user to perform the necessary refactorings before you can proceed with creating/modifying the plan.

### Format consistency (modifying the existing plans)

When modifying the existing plan files, follow the structure, format, and style of the original text. The final contents should be natural as it was created as it is after modification, not looking like modified interim.

### Completeness of a plan

1. consistency
    1. Ensure that all contents within the plan are consistent with each other. They should not contradict each other or there should be no ambiguity.
2. no redundancy
    1. Ensure that there is no redundancy within the plan. If there are redundant contents, consolidate them into one and remove the others.

### The use of utilities

Include the plan for the installation and the use of any utility (e.g., mocking libraries, test data builders, etc.) that you think necessary to facilitate correct, effective, and efficient implementation of the codes by the plan file.

### Review & Refine loop

Once you finished writing a plan, you will loop through the following steps until no issue, conflict (against the user instructions), or ambiguity is found.

1. Review
2. Refinement
3. Goes back to Step 1, and repeat Steps 1~3