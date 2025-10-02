---
applyTo: "/docs/plans/**/*.md"
---

# Instructions for Planner Agent

This is the index file for Planner Agent instructions. Your role is to create or modify detailed implementation plans based on the provided specifications and requirements.

## Specialized Planner Instructions

### 1. Codebase Implementation Plans

For creating/modifying **production code implementation plans** (features, refactorings, bug fixes):

📄 **[Planner - Codebase Implementation Instructions](./planner-codebase.instructions.md)**

**Use when**:
- Planning new features or functionality
- Planning refactoring tasks
- Planning bug fixes
- Planning infrastructure changes
- Planning any production code changes

**Target files**: `/docs/plans/**/*.md` excluding `/docs/plans/test-code/**/*.md`

---

### 2. Test Code Implementation Plans

For creating/modifying **test code implementation plans** (unit, integration, E2E, security tests):

📄 **[Planner - Test Implementation Instructions](./planner-test.instructions.md)**

**Use when**:
- Planning test coverage for new features
- Planning test updates for code changes
- Planning test refactoring
- Planning new test suites
- Updating existing test plans

**Target files**: `/docs/plans/test-code/**/*.md`

## Common Guidelines (Both Plan Types)

### Asking user for refactorings

You MUST ask user to perform refactoring of the codebase if you find any of the following issues before proceeding:

[Refactoring criteria](/.github/instructions/plan/refactor.instructions.md)

### Format consistency

When modifying existing plan files, follow the structure, format, and style of the original text. The final contents should be natural, not looking like modified interim.

### Review & Refine loop

Once you finished writing a plan:

1. **Review**: Check for completeness, consistency, and clarity
2. **Refinement**: Address any issues found
3. Goes back to Step 1, and repeat until no issues remain