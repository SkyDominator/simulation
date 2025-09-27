`$TARGET`: `security test codes implemented in PR #46`

Run tests for `$TARGET` and get the test report. Example:

```shell
# Run all backend security tests
cd src/backend && python -m pytest tests/integration/api/test_security.py -v

# Run frontend security tests
cd src/frontend && npm run test:run src/test/security/
```

Review the report and decide whether the problems lie on the codebase or test codes themselves. If you have questions that need to be clarified, pause reviewing and ask the user first.

If no questions exist (or all raised questions are solved by the user's answers), decide whether the problems lie on the codebase or test codes

If the problems lie on the test codes, fix them. If the problems lie on the codebase, raise Github issues by calling the GitHub create issue API with the details.

Fix Notes:
- Integrate DOMPurify for HTML sanitization
- Implement stricter Content Security Policy headers