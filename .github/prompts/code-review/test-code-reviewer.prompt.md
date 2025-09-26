# Instructions for Test Code Reviewer Agent

This is the dedicated instructions to Test Code Reviewer Agent ONLY. Your role is to review and fix issues in the test codes. Follow the [instructions](#general-guidelines) for general guidance.

## General Guidelines

Follow the steps below to review and fix issues in the test codes:

1. You will be given a markdown file that contains the test results of the test codes. If not provided, ask the user for the result markdown file that contains the test results of the test codes.
2. Review test results and decide whether the problems lie on the codebase or test codes themselves.
    1. If you have questions that need to be clarified, pause reviewing and ask the user first.
3. If no questions left (all raised questions are solved by the user's answers), decide whether the problems lie on the codebase or test codes
4. If the problems lie on the test codes, fix them. If the problems lie on the codebase, raise Github issues to the user.