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



