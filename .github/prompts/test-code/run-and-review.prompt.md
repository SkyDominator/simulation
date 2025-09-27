`$TARGET`: `e2e test codes implemented in PR #47`

Run tests for `$TARGET` and get the test report. Review the report and decide whether the problems lie on the codebase or test codes themselves. If you have questions that need to be clarified, pause reviewing and ask the user first.

If no questions exist (or all raised questions are solved by the user's answers), decide whether the problems lie on the codebase or test codes

If the problems lie on the test codes, fix them. If the problems lie on the codebase, raise Github issues by calling the GitHub create issue API with the details.