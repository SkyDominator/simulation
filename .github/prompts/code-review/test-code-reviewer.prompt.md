# Test Code Review Guidelines

You will be given a markdown file (backend) or a JSON file (frontend) that contains the test report of the test codes. If not provided, ask the user for the report file. Review the report and decide whether the problems lie on the codebase or test codes themselves. If you have questions that need to be clarified, pause reviewing and ask the user first.

If no questions exist (or all raised questions are solved by the user's answers), decide whether the problems lie on the codebase or test codes

If the problems lie on the test codes, fix them. If the problems lie on the codebase, raise Github issues by calling the GitHub create issue API with the details.

## Review Checklist

### Test Coverage
- **DO** verify test covers all public methods/functions
- **DO** ensure edge cases are tested (null, empty, boundary values)
- **DO** check error scenarios have dedicated tests
- **DON'T** accept tests without assertions
- **DON'T** approve if critical paths lack coverage

### Test Structure
- **DO** enforce AAA pattern (Arrange/Act/Assert) or Given/When/Then
- **DO** require descriptive test names: `test_<method>_<scenario>_<expected_result>`
- **DO** group related tests in describe blocks or test classes
- **DON'T** allow multiple unrelated assertions per test
- **DON'T** permit test interdependencies

### Code Quality
- **DO** use proper mocking/stubbing for external dependencies
- **DO** ensure test data is minimal and focused
- **DO** verify cleanup in tearDown/afterEach hooks
- **DON'T** allow hardcoded values without constants
- **DON'T** permit sleep/wait without explicit timeout reasoning
- **DON'T** accept commented-out test code

### Assertions
- **DO** use specific assertion methods (assertEqual vs assertTrue)
- **DO** include meaningful assertion messages
- **DO** verify both positive and negative cases
- **DON'T** allow empty try-catch blocks in tests
- **DON'T** accept assertions that always pass

### Performance
- **DO** flag tests taking >1s without justification
- **DO** require async/await for promise-based tests
- **DO** check for proper resource disposal
- **DON'T** allow unnecessary database/network calls
- **DON'T** permit infinite loops or recursive calls

## Common Issues to Flag

### Backend (Python/pytest)
- Missing `pytest.raises()` for exception testing
- Incorrect fixture scope (session vs function)
- Missing `@pytest.mark.asyncio` for async tests
- Improper use of `monkeypatch` or `mock.patch`
- Database transactions not rolled back

### Frontend (TypeScript/Vitest)
- Missing `await` for async operations
- Improper `render()` cleanup in React tests
- Not using `userEvent` over `fireEvent`
- Missing `act()` wrapper for state updates
- Unhandled promise rejections

## Issue Creation Template

When creating GitHub issues for codebase problems:

```markdown
**Test Failure Summary**
- Test: `<test_name>`
- File: `<file_path>`
- Error: `<error_message>`

**Expected Behavior**
<What the test expects>

**Actual Behavior**
<What actually happens>

**Root Cause**
<Analysis of why it fails>

**Suggested Fix**
<Proposed solution>

**Priority**: High/Medium/Low
**Labels**: bug, test-failure, <component>
```



