# Syncing $SINGLE_SOURCE_OF_TRUTH and $SOURCE and $TARGET

$SINGLE_SOURCE_OF_TRUTH: [SSD](/.github/copilot-instructions.md)
$SOURCE: [test-code-00-master](/.memo/CE/plans/test-code/test-code-00-master.md)
$TARGET: [test-plan-01-backend-unit](/.memo/CE/plans/test-code/test-code-01-backend-unit.md)
$OBJECT: My app specification
$REVIEW_DIR: [review](/.memo/CE/plans/test-code/review/)
$REVIEW_FILE: `review-sync-00-01-{date}-{idx}.md`

## Instructions

First, read thoroghly (from the top to the bottom) $SINGLE_SOURCE_OF_TRUTH, repeatedly if necessary, until you completely understand $OBJECT. Think hard for understanding my app.

Then, read thoroghly (from the top to the bottom) $SOURCE, repeatedly if necessary, until you completely understand it. Think hard for understanding it.

After that, repeat the following steps (1~4) until no gaps between $SINGLE_SOURCE_OF_TRUTH and $SOURCE and $TARGET are found (need tripartite consistency) after revewing the $TARGET (Repeat the following steps until the review result says "no gaps are found") .

Here are the detailed steps:

1. Review $TARGET and find any gaps (differences) when compared to $SOURCE and $SINGLE_SOURCE_OF_TRUTH.

2. Save your review results as $REVIEW_FILE under $REVIEW_DIR folder. If no gaps are found (=the current $TARGET is fully consistent with both $SOURCE and $SINGLE_SOURCE_OF_TRUTH), you can write the review results as they are ("no gaps are found").

3. Given the $REVIEW_FILE review, modify the $TARGET to make it fully-consistent with the $SINGLE_SOURCE_OF_TRUTH and $SOURCE.

When modifying $TARGET, maintain the structure, format, and the style used in the original $TARGET. Avoid introducing new sections as much as possible that were not present in the original $TARGET. Do not mark the changes you made in any way in the final output, unless explicitly instructed to do so. For example, do not add "New" or "Modified" or "Clarified" or any kinds of texts or labels that indicate a change. Do not add any comments or explanations (e.g. "updated for implementation consistency", "deferred", "not yet implemented", etc.) or notes that indicating there were changes made. Just provide the final output as if it was originally written that way.

If the $REVIEW_FILE tells that no gaps are found, break the loop and finish the task.

4. Goes to Step 1 and repeat the same process (1~4). The review result file for the second iteration would be $REVIEW_FILE with incremented {idx} by 1, and so on.