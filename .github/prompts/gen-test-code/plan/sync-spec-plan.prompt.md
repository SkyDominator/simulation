# Syncing $SOURCE and $TARGET

$SOURCE: [SSD](/.memo/CE/specs/SSD.md)
$TARGET: [test-plan-master](/.memo/CE/plans/test-code/test-code-00-master.md)
$OBJECT: My app specification
$REVIEW_DIR: [review](/.memo/CE/plans/test-code/review/)

## Instructions

First, read thoroghly (from the top to the bottom) $SOURCE, repeatedly if necessary, until you completely understand $OBJECT. Think hard for understanding my app.

After that, repeat the following steps (1~4) until no gaps between $SOURCE and $TARGET are found after revewing the $TARGET (Repeat the following steps until the review result says "no gaps are found") .

Here are the detailed steps:

1. Review $TARGET and find any gaps (differences) when compared to $SOURCE.

2. Save your review results as `review-{date}-{idx}` under $REVIEW_DIR folder. If no gaps are found (=the current $SOURCE is fully consistent with $TARGET), you can write the review results as they are ("no gaps are found").

3. Given the `review-{date}-{idx}.md` review, modify the $TARGET to make it fully-consistent with the $SOURCE.

When modifying $TARGET, maintain the structure, format, and the style used in the original $TARGET. Avoid introducing new sections as much as possible that were not present in the original $TARGET. Do not mark the changes you made in any way in the final output, unless explicitly instructed to do so. For example, do not add "New" or "Modified" or "Clarified" or any kinds of texts or labels that indicate a change. Do not add any comments or explanations or notes that indicating there were changes made. Just provide the final output as if it was originally written that way.

If the `review-{date}-{idx}.md` tells that no gaps are found, break the loop and finish the task.

4. Goes to Step 1 and repeat the same process (1~4). The review result file for the second iteration would be `review-{date}-{idx+1}`, and so on.