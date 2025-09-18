## METADATA

$SINGLE_SOURCE_OF_TRUTH: [SSD](/.memo/CE/specs/SSD.md)
$TARGET: [test-plan-master](/.memo/CE/plans/test-code/test-code-00-master.md)
$REVIEW_DIR: [review](/.memo/CE/plans/test-code/review/)
$REVIEW_FILE: `review-master-{date}-{idx}.md`

## Tasks (Refine Process)

1. Review Phase: Read thoroughly $TARGET on the review areas (See Review Areas section), and write your review result as $REVIEW_FILE under $REVIEW_DIR.
    * If this is the second or later iteration, the new $REVIEW_FILE should be created with incremented {idx}.
2. Refine Phase: Once you create the review result (`review-master-{date}-{idx}.md`), refine $TARGET by applying the suggestions in the review result.
3. Repeat: Repeat the above two phases until no suggestion (except `NEED_DECISION` tagged items, See Rules for Generating Suggestions for more details) is found in a review result.

## Review Instructions

### Review Areas

#### 1. Clarity

Check if there are ambiguous, unclear, or incomplete items or sections in the $TARGET. If any, list them with explanations of why they are ambiguous or unclear, and suggest how to improve them. All your suggestions must be generated according to the "Rules for Generating Suggestions" below.

#### 2. Format Consistency

Check for consistent terminology, formatting, and style throughout the document. All your suggestions must be generated according to the "Rules for Generating Suggestions" below.

#### 3. Contents Consistency

Ensure that all contents/items in all sections are coherent, logically structured, and not contradictory to each other. All your suggestions must be generated according to the "Rules for Generating Suggestions" below.

### Rules for Generating Suggestions

#### Basic Rules for Generating Suggestions

1. Any suggestion must qualify (comply with and consistent with) the $SINGLE_SOURCE_OF_TRUTH.
2. If it qualifies but still has multiple possible interpretations or implementations, follow the best practices of the domain or industry given the environments of the application described in the $SINGLE_SOURCE_OF_TRUTH.
3. If it fully qualifies $SINGLE_SOURCE_OF_TRUTH and follows the best practices, but still has multiple possible interpretations or implementations (which is only the case that the found issue is a type of issue that the next step must be decided by the developer himself in nature), leave it with `NEED_DECISION` tag instead of suggesting a specific solution.

#### Other Constraints

1. Any suggestion must be at the abstraction level of $TARGET. Do not suggest low-level implementation details or high-level design decisions.
2. Any suggestion must be specific to the context of $TARGET and actionable. Do not suggest generic best practices or principles.

## Refinement Instructions

### Abstraction Level of $TARGET

* $TARGET is a test plan document so that it is not a low-level implementation spec but a mid-level plan that guides actual test code implementation.
* It can include some low-level details (e.g., specific test cases, code snippets) but should not be too low-level (e.g., actual code).
