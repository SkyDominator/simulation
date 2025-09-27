# Review & Refinement

$SINGLE_SOURCE_OF_TRUTH: [SSD](/.github/copilot-instructions.md)
$TARGET: [test-plan-01-backend-unit](/.memo/CE/plans/test-code/test-plan-01-backend-unit.md)
$REVIEW_DIR: [review](/.memo/CE/plans/test-code/review/)
$REVIEW_FILE: `review-01-{date}-{idx}.md`

There are 3 steps in total, and you will loop through them until no issue-suggestion pair (except `NEED_DECISION` tagged items) is found in the new $REVIEW_FILE.

1. Review
2. Refinement
3. Goes back to Step 1, and repeat Steps 1~3

# 1. Review
Read thoroughly $TARGET on the review areas, and write your review result as $REVIEW_FILE under $REVIEW_DIR. If this is the second or later iteration, the new $REVIEW_FILE should be created with incremented {idx}.

## Review Areas

### Clarity

Check if there are ambiguous, unclear, or incomplete items or sections in the $TARGET. If any, list them with explanations of why they are ambiguous or unclear, and suggest how to improve them. All your suggestions must be generated according to the "Rules for Generating Suggestions" below.

### Format Consistency

Check for consistent terminology, formatting, and style throughout the document. All your suggestions must be generated according to the "Rules for Generating Suggestions" below.

### Contents Consistency

Ensure that all contents/items in all sections are coherent, logically structured, and not contradictory to each other. All your suggestions must be generated according to the "Rules for Generating Suggestions" below.

## Rules for Generating Suggestions

### Basic Rules

1. Any suggestion must qualify (comply with and consistent with) the $SINGLE_SOURCE_OF_TRUTH.
2. If it qualifies but still has multiple possible interpretations or implementations, follow the best practices, as of today, of the domain or industry given the environments of the application described in the $SINGLE_SOURCE_OF_TRUTH.
3. If it fully qualifies $SINGLE_SOURCE_OF_TRUTH and follows the best practices, but still has multiple possible interpretations or implementations (which is only the case that the found issue is a type of issue that the next step must be decided by the developer himself in nature), leave it with `NEED_DECISION` tag instead of suggesting a specific solution. Each `NEED_DECISION` tagged item must include links (line numbers) to the relevant item of the $TARGET for easy reference.

### Constraints

1. Any suggestion must be at the abstraction level of $TARGET. Do not suggest low-level implementation details or high-level design decisions.
2. Any suggestion must be specific to the context of $TARGET and actionable. Do not suggest generic best practices or principles.

# 2. Refinement

Once you create the $REVIEW_FILE, refine $TARGET by applying the suggestions in the $REVIEW_FILE.

## Abstraction Level of $TARGET

* $TARGET is a test plan document so that it is not a low-level implementation spec but a mid-level plan that guides actual test code implementation.
* It can include some low-level details (e.g., specific test cases, code snippets) but should not be too low-level (e.g., actual code).

## Constraints

* Do not add "Deferred Items" section or similar sections unless it is absolutely necessary. The test plan should focus on the current scope and not include too many hypothetical or future items.

# 3. Goes back to Step 1, and repeat Steps 1~3

Goes back to and run 1~3 steps, repeatedly. Loop until no issue-suggestion pair (except `NEED_DECISION` tagged items, See Rules for Generating Suggestions for more details) is found in the new $REVIEW_FILE. DO NOT BREAK THE LOOP until that condition is met.