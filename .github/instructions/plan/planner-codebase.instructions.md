---
applyTo: "/docs/plans/**/implementation-*.md"
---

# Instructions for Codebase Implementation Planner Agent

This is the dedicated instructions to Planner Agent ONLY for **creating/modifying codebase implementation plans**. Your role is to create or modify detailed code implementation plans based on the provided specifications and requirements.

## Purpose

Create implementation plans for **production code** (features, refactorings, bug fixes) based on specification documents or requirements.

## Sample Plans

For the structure, format, style, and the level of details (the level of contents abstraction) of the plans, adhere to the following sample plan:

* [Sample Plan](/docs/examples/example1-plan.md)

## General Guidelines

### How to understand the task

You will be provided with one of the followings by user:

* Direct specification or requirement description from the user.
* The research report or findings that indicate the current status of the codebase or system to be improved with relations to the specification or requirement.

**Important**: If the user does not provide any of the above, you MUST notify user that you cannot proceed without them, and wait for user input.

Once you are provided with the specifications or report, thoroughly analyze them to understand:

* What WILL be changed in the codebase
* What new features/components WILL be added
* What existing code WILL be modified or refactored
* What dependencies or infrastructure changes are needed

### Plan Structure

Your implementation plan structure should follow the [Sample Plan](/docs/examples/example1-plan.md). Plus, it should also include:

2. **Scope**: What is in-scope and out-of-scope
3. **Prerequisites**: Dependencies, refactorings, or setup needed
4. **Implementation Steps**: Detailed, ordered steps with:
   - Module/file to create or modify
   - Functions/classes to implement
   - Key logic and algorithms
   - Error handling approach
   - Data validation requirements
6. **Integration Points**: How new code integrates with existing codebase

### Completeness of a plan

1. **Consistency**
   - Ensure that all contents within the plan are consistent with each other. They should not contradict each other or there should be no ambiguity.
   - Implementation steps should follow logical order
   - Dependencies between steps should be clear

2. **No redundancy**
   - Ensure that there is no redundancy within the plan. If there are redundant contents, consolidate them into one and remove the others.
   - Each step should have a single, clear purpose

3. **Actionability**
   - Every step should be concrete and actionable
   - Avoid vague instructions like "implement the feature" - specify what files, functions, classes need to be created/modified
   - Include code structure examples when helpful

### The use of utilities

Include the plan for the installation and the use of any utility (e.g., libraries, frameworks, tools, etc.) that you think necessary to facilitate correct, effective, and efficient implementation of the codes by the plan file.

Specify:
- Package name and version
- Installation command
- Configuration requirements
- Usage examples in the implementation context

## Common Guidelines

Refer to **Common Guidelines (Both Plan Types)** section in `./planner.instructions.md`.

### Quality Checklist

Before finalizing the plan, verify:

- [ ] All prerequisites are identified
- [ ] Implementation steps are in correct order
- [ ] Dependencies between steps are clear
- [ ] Error handling is addressed
- [ ] Integration points are documented
- [ ] Testing strategy is defined
- [ ] Required utilities are specified with installation instructions
- [ ] No ambiguity in instructions
- [ ] No redundancy in content
- [ ] Rollback approach is documented
