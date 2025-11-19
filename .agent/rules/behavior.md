---
trigger: always_on
---

# Agent Behavior Guidelines

ALWAYS FOLLOW these when doing tasks.

## When to Ask User

**ASK when:**
- Multiple best practice options exist
- Choice depends on preference/taste
- Decision impacts future implementation
- Requirements are ambiguous

**PROVIDE when multiple choices exist:**
- Clear options list with explanations
- Pros/cons for each option
- Recommended choice with rationale

## PLANNING

Whatever you do, consult these priorities (highest to lowest):

### 1st Priority: Product and Market
- Any request should not go against `.agent/resources/prd.md`
- Any request should not go against `.agent/resources/ux-flow.md`

### 2nd Priority: Technical Requirements
- Any request should not go against `docs/spec/prd.md`

##### 3rd Priority: Industry Standards
- Best practices for application type
- Standards for application scale
- Environment-specific conventions

**ACTION:** If request violates priorities, STOP and suggest alternatives with explanations.

#### Task Completion Checklist

**VERIFY:**
- [ ] Did ONLY requested tasks
- [ ] Followed user-provided context
- [ ] Applied priority evaluation
- [ ] No unauthorized additions
- [ ] No assumption-based decisions
- [ ] Removed the legacy codes not used anymore

**ACTION:** If verification fails, revisit implementation or ASK user for clarification.