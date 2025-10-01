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

1. **Scope**: What is in-scope and out-of-scope
2. **Prerequisites**: Dependencies, refactorings, or setup needed
3. **Testability Requirements**: 
   - Frontend: List of all `data-testid` attributes to be added
   - Backend: Dependency injection points and mockable interfaces
   - Test mode considerations
4. **Implementation Steps**: Detailed, ordered steps with:
   - Module/file to create or modify
   - Functions/classes to implement
   - Key logic and algorithms
   - Error handling approach
   - Data validation requirements
   - **Testability considerations**: Where to add test IDs, dependency injection points
5. **Integration Points**: How new code integrates with existing codebase

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

4. **Testability**
   - All React components must include `data-testid` specifications
   - Backend code must specify dependency injection points
   - Implementation steps must include where to add test IDs
   - No component should be implemented without testability considerations

### The use of utilities

Include the plan for the installation and the use of any utility (e.g., libraries, frameworks, tools, etc.) that you think necessary to facilitate correct, effective, and efficient implementation of the codes by the plan file.

Specify:
- Package name and version
- Installation command
- Configuration requirements
- Usage examples in the implementation context

## Testability-First Principles

All codebase implementation plans MUST consider testability from the beginning. Code should be designed and implemented to be easily testable.

### Frontend Component Testability

**EVERY React component MUST include `data-testid` attributes** for test automation:

```typescript
// Example: Component implementation with test IDs
export const LoginForm: React.FC = () => {
  return (
    <form data-testid="login-form">
      <TextField
        data-testid="username-input"
        label="Username"
        name="username"
      />
      <TextField
        data-testid="password-input"
        label="Password"
        name="password"
        type="password"
      />
      <Button 
        data-testid="login-submit-button"
        type="submit"
      >
        Login
      </Button>
      <Link data-testid="forgot-password-link" href="/forgot">
        Forgot Password?
      </Link>
    </form>
  );
};
```

**Requirements**:
- Add `data-testid` to ALL interactive elements (buttons, inputs, links, etc.)
- Add `data-testid` to container elements (forms, dialogs, sections)
- Add `data-testid` to dynamic/conditional elements
- Use kebab-case naming: `{component-name}-{element-type}`
- Ensure test IDs are unique within the component scope

**Plan Requirements**:
- Include a section documenting all `data-testid` attributes for new components
- Specify test IDs for components being modified
- Follow the naming convention: `{feature}-{component}-{element}`
- Examples: `login-form-submit-button`, `profile-avatar-image`, `simulation-results-table`

### Backend Testability

**Design for dependency injection and loose coupling**:

```python
# Example: Testable service with dependency injection
class SimulationService:
    def __init__(self, db_client=None, cache_client=None):
        """Initialize with injectable dependencies for testability."""
        self.db = db_client or get_default_db_client()
        self.cache = cache_client or get_default_cache_client()
    
    def create_simulation(self, user_id: str, plan_data: dict):
        """Create simulation with clear interface for mocking."""
        # Business logic here
        pass
```

**Requirements**:
- Use dependency injection for external services (database, APIs, etc.)
- Separate business logic from I/O operations
- Make functions pure and side-effect-free where possible
- Use interfaces/protocols for dependencies
- Avoid tight coupling to infrastructure

**Plan Requirements**:
- Specify dependency injection points
- Document which dependencies can be mocked
- Include interface definitions for key abstractions

### General Testability Principles

1. **Decoupling**: Components/functions should have minimal dependencies
2. **Single Responsibility**: Each unit should have one clear purpose
3. **Clear Interfaces**: Well-defined inputs and outputs
4. **Avoid Hidden State**: Make state explicit and controllable
5. **Error Handling**: Predictable error responses for testing
6. **Configuration**: Use environment variables or config for test overrides

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
- [ ] **Testability**: All React components include `data-testid` attributes in implementation steps
- [ ] **Testability**: Frontend test IDs are documented with naming convention
- [ ] **Testability**: Backend dependency injection points are specified
- [ ] **Testability**: Mockable interfaces/abstractions are identified
- [ ] **Testability**: Code architecture supports isolated unit testing
