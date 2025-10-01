---
applyTo: "/docs/plans/test-code/**/*.md"
---

# Instructions for Test Code Implementation Planner Agent

This is the dedicated instructions to Planner Agent ONLY for **creating/modifying test code implementation plans**. Your role is to create or modify detailed test implementation plans based on the codebase changes or specifications.

## Purpose

Create implementation plans for **test code** (unit tests, integration tests, E2E tests, security tests) that validate production code changes or new features.

## Testing Principles & Requirements

All test plans MUST adhere to these core principles:

### 1. E2E Testing Configuration
- **NO video recording** in E2E tests
- **NO trace collection** in E2E tests
- **NO screenshot/image capturing** in E2E tests
- Focus on lightweight, fast test execution

### 2. Component Testability (Frontend)
- **Add `data-testid` attributes to ALL components** in the frontend codebase
- Use ONLY `data-testid` to locate React components in tests
- **NEVER locate components by labels, text content, or CSS selectors**
- Every interactive element MUST have a unique `data-testid`
- Format: `data-testid="component-name-element-type"` (e.g., `data-testid="login-button"`, `data-testid="username-input"`)

### 3. Test Mode Flag
- Use `import.meta.env.VITE_TEST_MODE` (frontend) or equivalent environment variable (backend) to indicate test mode
- Set to `true` when running test codes
- Use as a test mode flag across ALL test layers (unit, integration, E2E)
- Apply test mode checks to:
  - Disable external API calls in test environments
  - Enable mock data providers
  - Skip time-consuming operations
  - Conditionally render test-specific UI elements

### 4. Code Architecture for Testability
- **Use dependency injection** wherever possible
- Write **decoupled code** to facilitate isolated testing
- Extract business logic from UI components
- Use interfaces/abstracts for external dependencies
- Make functions pure and side-effect-free when possible

### 5. Mocking Strategy
- **ALWAYS use mocking libraries**:
  - Backend: `pytest-mock`, `unittest.mock`
  - Frontend: `vitest` built-in mocks, `msw` for network mocking
- Mock external dependencies, not internal logic
- Use MSW (Mock Service Worker) for API mocking in frontend tests
- Create reusable mock factories and fixtures

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

### Test Plan Structure

Your implementation plan structure should follow the these:

* [Sample Plan 1](/docs/plans/test-code-v1/test-plan-03-frontend-smoke.md)
* [Sample Plan 2](/docs/plans/test-code-v1/test-plan-01-backend-unit.md)

Plus, it should also include:

1. **Scope & Principles**: What will be tested and testing approach
2. **Test Categories**: Organized by functionality or test type
3. **Test Cases**: For each test, specify:
   - Test ID (e.g., CAT-XXX-###)
   - Test name (descriptive, follows naming convention)
   - What is being tested
   - Setup/preconditions
   - Test steps/actions
   - Expected results
   - Mock requirements (MUST specify mocking library to use)
   - **Frontend tests**: List all `data-testid` values needed for component location
4. **Test Utilities**: Shared fixtures, helpers, test data builders
5. **Mock Strategy**: What to mock, what to test against real implementations (MUST use mocking libraries)
6. **Test Mode Configuration**: How to use `import.meta.env.VITE_TEST_MODE` flag
7. **Component Test IDs**: Complete list of `data-testid` attributes needed (frontend tests)
8. **Coverage Goals**: What percentage or specific code paths to cover
9. **Dependencies**: Required libraries, test frameworks, utilities

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

**Required test utilities**:

**Backend**:
- `pytest-mock` (REQUIRED): Advanced mocking with `mocker` fixture
- `unittest.mock` (built-in): Standard Python mocking
- `freezegun`: Time/date mocking
- `faker`: Test data generation
- `factory-boy`: Test data factories

**Frontend**:
- `@testing-library/react` (REQUIRED): Component testing utilities
  - Use `screen.getByTestId()` exclusively for component queries
- `@testing-library/user-event` (REQUIRED): User interaction simulation
- `vitest` (REQUIRED): Test runner with built-in mocking capabilities
- `msw` (REQUIRED): API mocking at network layer for all HTTP requests
- `@playwright/test`: E2E testing framework
  - Configure with NO video, NO trace, NO screenshots
  - Use `page.getByTestId()` for element location

### Mock Strategy Guidelines

**ALWAYS use mocking libraries** - never manually implement mocks:
- **Backend**: `pytest-mock` (mocker fixture), `unittest.mock`
- **Frontend**: `vitest` built-in mocks, `msw` for API mocking

**What to mock**:
- External services (APIs, databases, third-party services)
- Time-dependent functions
- Network calls
- File system operations
- Authentication/authorization checks (in unit tests)
- Third-party library calls with side effects

**What NOT to mock**:
- The code under test
- Simple utility functions
- Data structures
- Pure functions without side effects
- Internal business logic

**Mocking levels**:
- **Unit tests**: Mock ALL external dependencies, test in complete isolation
- **Integration tests**: Mock external services only, use real internal components
- **E2E tests**: Minimize mocking, use MSW for controlled API responses when needed

**Component Location Strategy (Frontend)**:
- **ONLY use `data-testid`** to locate components
- **NEVER use**:
  - Text content (e.g., `getByText('Login')`)
  - Labels (e.g., `getByLabelText('Username')`)
  - CSS classes or selectors
  - Roles with text (use `data-testid` instead)
- Example: `screen.getByTestId('login-button')` ✅
- Anti-example: `screen.getByText('Login')` ❌

### E2E Test Configuration

**Playwright Configuration Requirements**:
```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    // REQUIRED: Disable all recording features
    video: 'off',          // NO video recording
    trace: 'off',          // NO trace collection
    screenshot: 'off',     // NO screenshots
    
    // Test mode flag
    baseURL: process.env.VITE_TEST_MODE === 'true' 
      ? 'http://localhost:5173' 
      : 'http://localhost:4173',
  },
});
```

**E2E Test Implementation**:
- Use `page.getByTestId('element-id')` for ALL element location
- Set `VITE_TEST_MODE=true` in test environment
- Mock external APIs using MSW when necessary
- Keep tests fast and lightweight (no media capture overhead)

### Test Mode Flag Usage

**Frontend (Vite)**:
```typescript
// .env.test
VITE_TEST_MODE=true

// Component code
if (import.meta.env.VITE_TEST_MODE) {
  // Use mock data or skip expensive operations
}

// Test configuration
beforeAll(() => {
  import.meta.env.VITE_TEST_MODE = true;
});
```

**Backend (Python)**:
```python
# pytest fixture or conftest.py
@pytest.fixture(autouse=True)
def set_test_mode():
    os.environ['TEST_MODE'] = 'true'
    yield
    os.environ.pop('TEST_MODE', None)

# Application code
if os.getenv('TEST_MODE') == 'true':
    # Use mock implementations
```

### Component Test ID Implementation Requirements

**ALL frontend components MUST include `data-testid` attributes**:

```typescript
// Example: Button component
<Button 
  data-testid="submit-button"
  onClick={handleSubmit}
>
  Submit
</Button>

// Example: Input field
<TextField
  data-testid="username-input"
  label="Username"
  value={username}
/>

// Example: Container/Section
<div data-testid="login-form">
  <TextField data-testid="username-input" />
  <TextField data-testid="password-input" />
  <Button data-testid="login-button" />
</div>
```

**Test ID Naming Convention**:
- Format: `{component-name}-{element-type}`
- Use kebab-case (lowercase with hyphens)
- Be descriptive and unique
- Examples: `login-button`, `user-profile-avatar`, `simulation-results-table`

**Plan Requirements**:
- Include a complete list of all `data-testid` values needed for each test
- Specify which components need test IDs added (if not already present)
- Document the test ID naming scheme for the feature being tested

## Common Guidelines

Refer to **Common Guidelines (Both Plan Types)** section in `./planner.instructions.md`.

### Quality Checklist

Before finalizing the plan, verify:

- [ ] All affected code paths have test coverage
- [ ] Test IDs are unique and sequential
- [ ] Test names are descriptive and follow conventions
- [ ] Mock strategy is clear and consistent
- [ ] **Mocking libraries are specified** (pytest-mock, MSW, etc.)
- [ ] Required test utilities are specified with installation instructions
- [ ] Setup/teardown requirements are documented
- [ ] Expected results are clearly defined
- [ ] Error scenarios are covered
- [ ] Edge cases are identified
- [ ] No ambiguity in test steps
- [ ] No redundancy in test cases
- [ ] Coverage goals are realistic and measurable
- [ ] **Frontend tests**: All component test IDs (`data-testid`) are documented
- [ ] **Frontend tests**: NO text/label-based component location
- [ ] **E2E tests**: Video, trace, and screenshots are DISABLED
- [ ] **Test mode flag** (`VITE_TEST_MODE`/`TEST_MODE`) usage is documented
- [ ] **Dependency injection** and decoupling strategies are specified where applicable
