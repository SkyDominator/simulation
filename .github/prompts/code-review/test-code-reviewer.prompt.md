Follow the steps below to review and fix issues in the test codes:

1. You will be given a markdown file or a JSON file that contains the test results of the test codes. If not provided, ask the user for the result markdown file that contains the test results of the test codes.
2. Review test results and decide whether the problems lie on the codebase or test codes themselves.
    1. If you have questions that need to be clarified, pause reviewing and ask the user first.
3. If no questions left (all raised questions are solved by the user's answers), decide whether the problems lie on the codebase or test codes
4. If the problems lie on the test codes, fix them. If the problems lie on the codebase, raise Github issues to the user by calling the GitHub create issue API with the provided details.