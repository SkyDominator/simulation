### Pull Requests Guidelines

Before submitting a Pull Request, ensure it meets these guidelines:

#### 1. General Guidelines

Keep PRs small and focused on a single change. Avoid mixing features with refactoring or adding unrelated changes. This approach:

- Speeds up review process
- Simplifies cherry-picking for bug-fix releases
- Reduces reviewer cognitive load

For larger changes, consider maintaining a Draft PR and creating smaller, reviewable PRs from it.

#### 2. Commit Messages

Follow these conventions:

1. **Separate subject from body with a blank line**
2. **Limit subject line to ~50 characters**
3. **Capitalize the subject line**
4. **No period at the end of subject**
5. **Use imperative mood** (e.g., "Add feature", "Fix bug")
   - Test: _"If applied, this commit will **\<subject\>**"_
6. **Wrap body at 72 characters**
7. **Explain what and why, not how**
   - Include context and reasoning
   - Reference related issues/PRs at bottom
     _“If applied, this commit will **<subject>**”._

6. **Wrap the body at 72 characters**  
   - Improves readability in terminals and tools.

7. **Use the body to explain *what* and *why*, not *how***  
   - The diff already shows *how*.  
   - Explain the context, purpose, and reasoning behind the change.  
   - Optionally, reference related issues or PRs at the bottom.

