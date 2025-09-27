# Guidelines for Copilot Agents

## Pull Requests

This document describes how you can create Pull Requests. Before you submit a Pull Request (PR), check that it meets these guidelines:

### 1. General Guidelines

Make sure your PR is small and focused on one change only - avoid adding unrelated changes, mixing adding features and refactoring. Keeping to that rule will make it easier to review your PR and will make it easier for release managers if they decide that your change should be cherry-picked to release it in a bug-fix release. If you want to add a new feature and refactor the code, it's better to split the PR into several smaller PRs. It's also quite a good and common idea to keep a big `Draft` PR if you have a bigger change that you want to make and then create smaller PRs from it that are easier to review and merge and cherry-pick. It takes a long time (and a lot of attention and focus of a reviewer) to review big PRs so by splitting it into smaller PRs you actually speed up the review process and make it easier for your change to be eventually merged.

### 2. Commit Messages

Adhere to the following rules for commit messages:

1. **Separate subject from body with a blank line**  
   - Leave one empty line after the subject before writing the body.

2. **Limit the subject line to ~50 characters**  
   - Keep the summary short and scannable.  
   - Git tools assume the first line is a title.

3. **Capitalize the subject line**  
   - Start with an uppercase letter.

4. **Do not end the subject line with a period**  
   - Avoid trailing punctuation in the summary.

5. **Use the imperative mood in the subject line**  
   - Example: `Add feature`, `Fix bug`, `Update docs`.  
   - Test it by filling in the blank:  
     _“If applied, this commit will **<subject>**”._

6. **Wrap the body at 72 characters**  
   - Improves readability in terminals and tools.

7. **Use the body to explain *what* and *why*, not *how***  
   - The diff already shows *how*.  
   - Explain the context, purpose, and reasoning behind the change.  
   - Optionally, reference related issues or PRs at the bottom.
