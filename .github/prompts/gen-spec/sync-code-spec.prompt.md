First, follow the instructions in [understand-codebase](/.github/prompts/understand-codebase.prompt.md)

After that, repeat the following steps (1~4) until no gaps between my current codebase ([frontend](/src/frontend/*) [backend](/src/backend/*)) and the [SSD](/.memo/CE/specs/SSD.md) are found after revewing the [SSD](/.memo/CE/specs/SSD.md) (Repeat the following steps until the review result says "no gaps are found") .

Here are the detailed steps:

1. Review [SSD](/.memo/CE/specs/SSD.md) and find any gaps (differences) when compared to my current codebase.

2. Save your review results as `SSD-review-{date}-{idx}` under [reviews](/.memo/CE/specs/reviews/) folder. If no gaps are found (=the current codebase is fully consistent with SSD), you can write the review results as they are ("no gaps are found").

3. Given the `SSD-review-{date}-{idx}.md` review, modify the [SSD](/.memo/CE/specs/SSD.md) to make it fully-consistent with the current codebase.

When modifying [SSD](/.memo/CE/specs/SSD.md), maintain the structure, format, and the style used in the original text. Avoid introducing new sections as much as possible that were not present in the original text. Do not mark the changes you made in any way in the final output, unless explicitly instructed to do so. For example, do not add "New" or "Modified" or "Clarified" or any kinds of texts or labels that indicate a change. Do not add any comments or explanations (e.g. "updated for implementation consistency", etc.) or notes that indicating there were changes made. Just provide the final output as if it was originally written that way.

If the `SSD-review-{date}-{idx}.md` tells that no gaps are found, break the loop and finish the task.

4. Goes to Step 1 and repeat the same process (1~4). The review result file for the second iteration would be `SSD-review-{date}-{idx+1}`, and so on.

Read the [SSD](/.memo/CE/specs/SSD.md) again and find the remaining gaps (differences) when compared to my current codebase.