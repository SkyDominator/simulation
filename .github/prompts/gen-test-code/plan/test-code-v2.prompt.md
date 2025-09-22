Improve the plan for test code generation for backend unit test of my app following the guidance below:

{SSD} = `/.memo/CE/specs/SSD.md`
{codebase} = `/src/backend/**`
{test-plan} = `/.memo/CE/plans/test-code/test-plan-02-backend-integration.md`

1. First, read thoroughly the {SSD} to correctly and fully understand the general aspects of my application.
2. Second, go through every file under the {codebase} and fully understand them. You must think hard to understand even the smallest details of the {codebase} codes. You must understand what's going on at each function, what kind of data is provided and what's the output (data flow), etc. The business logic, the error handling, and all the edge cases should be taken into account.
3. The current version of {test-plan} was too abstract, so I failed to implement correct and complete codes with {test-plan}. Make it more concrete and precise: The plan should include the code snippet examples to be implemented and also the references to line numbers and the file names in {codebase} that would be tested by the codes in those snippets.
4. BE VERY SPECIFIC in constituting test scenario and test plan; the plan should include what categories and what items (per category) should be tested, why, and how.
5. Do the continuous refinement (the refinement loop) of the plan file after you finished improving task. Review and refine the plan until all of the following checklist items below are satisfied. Do not stop until all checklist items are satisfied and the plan is perfect.
  - [ ] Does the plan cover all the important parts of my {codebase}?
  - [ ] Are all the test cases correctly matches to my {codebase} codes?
  - [ ] Does the plan include edge cases and error handling scenarios?
  - [ ] Are the test scenarios clearly defined and easy to understand?
  - [ ] Are there any missing test cases that should be included?
  - [ ] Does the plan align with best practices for unit testing in {codebase} development?
  - [ ] Are there any redundant or unnecessary test cases that can be removed?
  - [ ] Is the plan structured in a logical and organized manner?
  - [ ] Have I considered the maintainability of the test code in the plan?
  - [ ] Does the plan include considerations for mocking dependencies and isolating units under test?
  - [ ] Have I reviewed the plan for clarity, conciseness, and completeness?