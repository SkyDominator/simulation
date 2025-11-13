#  Verify Task Result

## Mappings

$TASK_RUNNER_PROMPT$: `../IS-93/research-00.prompt.md`
$TASK_RESULT_FILE$: `../../../../../docs/research/IS-62/IS-93/research-00.md`

I ran $TASK_RUNNER_PROMPT$ and got $TASK_RESULT_FILE$ as result. Verify this result according to:

1. No missing items in the task description in $TASK_RUNNER_PROMPT$.
2. Duplicated items are removed.
3. The format, structure, style is correctly followed as per the examples in $TASK_RUNNER_PROMPT$.
4. Unnecessary information that are not requested in the task description are removed.

Respond with "The task result is verified and correct." if the result is correct. If there are issues, list them clearly and concisely, and correct the $TASK_RESULT_FILE$ content accordingly.