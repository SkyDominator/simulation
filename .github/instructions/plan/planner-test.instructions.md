---
applyTo: "/docs/plans/test-code/**/*.md"
---

# Instructions for Test Code Implementation Planner Agent

This is the dedicated instructions to Planner Agent ONLY for **creating/modifying test code implementation plans**. Your role is to create or modify detailed test implementation plans based on the codebase changes or specifications.

## Purpose

Create implementation plans for **test code** (unit tests, integration tests, E2E tests, security tests) that validate production code changes or new features.

## Sample Plans

For the structure, format, style, and the level of details (the level of contents abstraction) of the plans, adhere to the following sample plans:

* [Sample Plan 1](/docs/plans/test-code-v1/test-plan-03-frontend-smoke.md)
* [Sample Plan 2](/docs/plans/test-code-v1/test-plan-01-backend-unit.md)

## General Guidelines

### How to understand the task

You will be provided with one of the followings by user:

* One or more commit hashes (e.g., `abc1231`) that indicate the code changes to be tested.
* One or more Github Pull Request number (e.g., `#28`) that indicates the code changes to be tested.
* One or more commit hashes that indicate the changes of specification document (e.g., SSD, etc.) whose implementation is to be tested.
* Test plan document references (e.g., test-plan-04, test-plan-06) to be updated

**Important**: If the user does not provide any of the above, you MUST notify user that you cannot proceed without them, and wait for user input.

Once you are provided with the commit hashes, PR numbers, or specifications, thoroughly analyze them to understand:

* What HAS BEEN changed in the codebase
* What parts of the codebase are affected by the changes (modules, components, functions, etc.)
* What new functionality needs test coverage
* What existing tests need updates
* What edge cases and error scenarios need coverage

### Asking user for refactorings

You MUST ask user to perform refactoring of the codebase if you find any of the following issues in the codebase before you can proceed with creating/modifying the plan:

[Refactoring criteria](/.github/instructions/plan/refactor.instructions.md)

In such cases, you MUST notify user of the issues you found and ask user to perform the necessary refactorings before you can proceed with creating/modifying the plan.

### Test Plan Structure

Your test implementation plan should include:

1. **Scope & Principles**: What will be tested and testing approach
2. **Test Categories**: Organized by functionality or test type
3. **Test Cases**: For each test, specify:
   - Test ID (e.g., CAT-XXX-###)
   - Test name (descriptive, follows naming convention)
   - What is being tested
   - Setup/preconditions
   - Test steps/actions
   - Expected results
   - Mock requirements
4. **Test Utilities**: Shared fixtures, helpers, test data builders
5. **Mock Strategy**: What to mock, what to test against real implementations
6. **Coverage Goals**: What percentage or specific code paths to cover
7. **Dependencies**: Required libraries, test frameworks, utilities

### Test Naming Conventions

Follow these patterns:

**Backend (Python/pytest)**:
```python
def test_CATEGORY_ID_description_of_test():
    """CAT-XXX-###: Human-readable description."""
```

**Frontend (TypeScript/Vitest)**:
```typescript
it('should description of expected behavior', () => {
  // CAT-XXX-### test implementation
});
```

### Format consistency (modifying the existing plans)

When modifying the existing plan files, follow the structure, format, and style of the original text. The final contents should be natural as it was created as it is after modification, not looking like modified interim.

### Completeness of a plan

1. **Consistency**
   - Ensure that all contents within the plan are consistent with each other. They should not contradict each other or there should be no ambiguity.
   - Test IDs should be unique and follow numbering convention
   - Mock strategy should be consistent across similar test cases

2. **No redundancy**
   - Ensure that there is no redundancy within the plan. If there are redundant contents, consolidate them into one and remove the others.
   - Each test should validate a distinct scenario or behavior
   - Shared test utilities should be extracted to fixtures

3. **Coverage completeness**
   - Happy path scenarios covered
   - Error/exception scenarios covered
   - Edge cases and boundary conditions covered
   - Security scenarios covered (authentication, authorization, input validation)
   - Integration points covered

### The use of utilities

Include the plan for the installation and the use of any utility (e.g., mocking libraries, test data builders, fixture libraries, etc.) that you think necessary to facilitate correct, effective, and efficient implementation of the test codes by the plan file.

Specify:
- Package name and version (e.g., `pytest-mock>=3.12.0`)
- Installation command
- Configuration in test files (imports, setup)
- Usage examples in test context

**Common test utilities**:

**Backend**:
- `pytest-mock`: Advanced mocking with `mocker` fixture
- `freezegun`: Time/date mocking
- `faker`: Test data generation
- `factory-boy`: Test data factories

**Frontend**:
- `@testing-library/react`: Component testing utilities
- `@testing-library/user-event`: User interaction simulation
- `vitest`: Test runner with mocking
- `msw`: API mocking at network layer
- `@playwright/test`: E2E testing framework

### Mock Strategy Guidelines

**What to mock**:
- External services (APIs, databases, third-party services)
- Time-dependent functions
- Network calls
- File system operations
- Authentication/authorization checks (in unit tests)

**What NOT to mock**:
- The code under test
- Simple utility functions
- Data structures
- Pure functions without side effects

**Mocking levels**:
- **Unit tests**: Mock dependencies, test in isolation
- **Integration tests**: Mock external services, use real internal components
- **E2E tests**: Minimize mocking, test against real or realistic services

### Review & Refine loop

Once you finished writing a plan, you will loop through the following steps until no issue, conflict (against the user instructions), or ambiguity is found.

1. **Review**: Check for completeness, consistency, and clarity
2. **Refinement**: Address any issues found
3. Goes back to Step 1, and repeat Steps 1~3

### Quality Checklist

Before finalizing the plan, verify:

- [ ] All affected code paths have test coverage
- [ ] Test IDs are unique and sequential
- [ ] Test names are descriptive and follow conventions
- [ ] Mock strategy is clear and consistent
- [ ] Required test utilities are specified with installation instructions
- [ ] Setup/teardown requirements are documented
- [ ] Expected results are clearly defined
- [ ] Error scenarios are covered
- [ ] Edge cases are identified
- [ ] No ambiguity in test steps
- [ ] No redundancy in test cases
- [ ] Coverage goals are realistic and measurable
