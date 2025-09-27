$PLAN = `/.memo/CE/plans/test-code/test-plan-01-backend-unit.md`
$MASTER_PLAN = `/.memo/CE/plans/test-code/test-code-00-master.md`
$SSD = `/.github/copilot-instructions.md`
$REPORT_PATH = `/.memo/CE/implement/report/{date}/test-plan-01-backend-unit.md`

Implement new codes or modify existing codes on the [backend](/src/backend/) or [frontend](/src/frontend/) codebase by exactly following the implementation plan described in $PLAN.

# Important notes

1. Install pre-requisite packages or dependencies first if necessary.
2. If you find any ambiguity or missing details in the plan, then:
    1. Refer to the $MASTER_PLAN to see if there are any related plans that can help clarify the ambiguity or missing details.
    2. If $MASTER_PLAN does not help, then refer to $SSD to see if there are any related specifications that can help clarify the ambiguity or missing details.
    3. If both $MASTER_PLAN and $SSD do not help, then mark `NEED_VERIFICATION` on the ambiguous parts on the $PLAN and skip the implementation of those parts for now, so that I can clarify the direction of next steps.
3. DO NOT GENERATE ANY OTHER CODES THAT ARE NOT PLANNED IN THE $PLAN.
4. After the implementation, review all your implementation results against the $PLAN, $MASTER_PLAN, and $SSD to ensure that everything is correctly implemented as planned.
5. If you find any discrepancies/issues during the review, fix them immediately.
6. Repeat steps 4 and 5 (review-refine loop) until the review results tell that everything is correctly implemented as planned.

# After the implementation

Write the implementation report to $REPORT_PATH. Use the following format and style for the report.

* Summary of changes made
* Any important context or considerations
* Reference to the $PLAN
    * Map between the items in the $PLAN and the implemented source codes (file names, line numbers)