# Research Generator 

The research provides the implementation snapshot of matters so that you don't have to go through the entire codebase every time you want to understand the implementations. It should provide the context and details of the implementation, the code map, the data flow, and the UX flows.

## The problem statements

### Implementation of matter

* `src/frontend/e2e/specs/auth-session.spec.ts`
    * An E2E test file for authentication and session management.

### Implementation plan

* `docs/plans/test-code/test-plan-08-frontend-e2e.md`.

### Issues

1. `E2E-AUTH-002` always pass but `E2E-AUTH-001` always fails.
2. `await expect(page.getByTestId("login-form")).toBeVisible({ timeout: 5000 });` in `E2E-AUTH-001` occasionally fails.

### My analysis

As the 2 test cases are almost similar, I think it is because of the following reasons:

1. Race condition as the test cases are run in parallel.
2. Two users concurrently access to different OAuth providers.

## The goal of research

The basic goal of this research is to identify:

1. ALL frontend codes related to the [issues](#issues).
2. The followings of the identified codes:
   1. code map
    * The references to the exact source code file paths and the line numbers
    * 
   2. data flow
   3. code execution flow

The advanced goal of this research is to identify:

1. Whether it is possible to run the 2 test cases in sequence.
2. Whether it is possible to use the same OAuth provider for the 2 test cases.
3. Any other possible reason for the failure of `E2E-AUTH-001`.

## The research outcome 

- Create a `/docs/research/pr-74-research-result.md` file to report your research results.
- Refer to the following examples for the structure, format, style of your research report:
    - `/docs/examples/example1-research.md`
    - `/docs/examples/example2-research.md`