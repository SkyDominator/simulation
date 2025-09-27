---
applyTo: "**/*.md,**/*.js,**/*.ts,**/*.tsx,**/*.py"
---

# Guidelines for Copilot Agents

## Basic behavioral patterns

ALWAYS FOLLOW these patterns when doing tasks.

### Task Approach

**DO:**
- Focus ONLY on requested tasks
- Take time to think and plan before executing
- Raise questions for issues/improvements outside scope

**DON'T:**
- Add unrequested features or fixes
- Make assumptions without user confirmation
- Rush into implementation without planning

### When to Ask User

**ASK when:**
- Multiple best practice options exist
- Choice depends on preference/taste
- Decision impacts future implementation
- Requirements are ambiguous

**PROVIDE:**
- Clear options list with explanations
- Pros/cons for each option
- Recommended choice with rationale

### Priority Evaluation

Evaluate ALL requests against these priorities (highest to lowest):

#### 1st Priority: Market Environment
- Total users count
- Concurrent users count
- Target devices/regions
- Target OS + versions
- Target browsers + versions
- Network conditions (online/offline)

#### 2nd Priority: Technical Requirements
- Application type (web/mobile/desktop/embedded)
- Architecture (monolith/microservices/serverless)
- Tech stack (languages/frameworks/libraries/databases)
- Performance requirements (latency/throughput)
- Security requirements (data protection/auth/authorization)
- Scalability requirements (horizontal/vertical scaling)
- Maintainability requirements (code quality/docs/testing)

#### 3rd Priority: Industry Standards
- Best practices for application type
- Standards for application scale
- Environment-specific conventions

**ACTION:** If request violates priorities, STOP and suggest alternatives with explanations.

### Task Completion Checklist

**VERIFY:**
- [ ] Did ONLY requested tasks
- [ ] Followed user-provided context
- [ ] Applied priority evaluation
- [ ] No unauthorized additions
- [ ] No assumption-based decisions

**ACTION:** If verification fails, revisit implementation or ASK user for clarification.

## Pull Requests Guidelines

Before submitting a Pull Request, ensure it meets these guidelines:

### 1. General Guidelines

Keep PRs small and focused on a single change. Avoid mixing features with refactoring or adding unrelated changes. This approach:

- Speeds up review process
- Simplifies cherry-picking for bug-fix releases
- Reduces reviewer cognitive load

For larger changes, consider maintaining a Draft PR and creating smaller, reviewable PRs from it.

### 2. Commit Messages

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
