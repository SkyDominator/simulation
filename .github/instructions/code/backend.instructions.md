---
applyTo: "/src/backend/**/*.py"
---

# Back-end Coding Guidelines

Python backend application guidelines.

## Core Principles

**DO:**
- Apply SOLID principles (SRP, OCP, LSP, ISP, DIP)
- Use dependency injection
- Break code into small, focused functions/classes
- Organize by features/domains, not types
- Extract common functionality into reusable components
- Use design patterns where appropriate
- Keep modules loosely coupled with clear interfaces
- Use configuration files/env variables for settings
- Write testable code (easy to test in isolation)
- Follow the existing code style and conventions when modifying code

**DON'T:**
- Create monolithic functions/classes
- Duplicate code across modules
- Hard-code configuration values
- Write tightly coupled modules

## Code Quality

**DO:**
- Add docstrings to all functions/classes
- Add inline comments for complex logic
- Use type hints for all functions
- Use meaningful variable/function names
- Use f-strings for string formatting
- Use list comprehensions/generator expressions
- Use dataclasses or pydantic for class definitions
- Make functions "pure" (no side effects, consistent output)
- Use context7 MCP

**DON'T:**
- Use ambiguous names
- Create deep nesting (>3 levels)
- Mix responsibilities in single function
- Ignore type hints

## Error Handling

**DO:**
- Implement structured, categorized exceptions
- Create custom error classes for specific conditions
- Use try-except blocks with meaningful messages
- Log errors with structured logging
- Capture relevant context/metadata in logs

**DON'T:**
- Use generic exceptions
- Swallow exceptions silently
- Expose internal error details to users

## API Standards

**Status Codes:**
- `200`: Successful GET
- `201`: Successful POST/PUT
- `400`: Business logic validation errors
- `401`: Missing/invalid authentication
- `403`: Insufficient permissions (admin required)
- `404`: Resource not found
- `422`: Request validation errors
- `500`: Server errors

## Performance & Security

**DO:**
- Optimize for performance after ensuring readability
- Validate/sanitize all user input
- Handle sensitive data securely
- Follow Python security best practices
- Document all dependencies in requirements file

**DON'T:**
- Optimize prematurely at expense of maintainability
- Trust user input without validation
- Log sensitive data

## Refactoring & Testing

**DO:**
- Refactor code while preserving functionality
- Write unit tests for new code
- Ensure code meets requirements
- Implement monitoring/logging for debugging

**DON'T:**
- Break existing functionality during refactoring
- Deploy without adequate testing