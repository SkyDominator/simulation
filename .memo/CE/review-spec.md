---
mode: agent
tools: ['codebase', 'usages', 'problems', 'fetch', 'searchResults', 'githubRepo', 'editFiles', 'search', 'context7', 'pylance mcp server', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand']
---

# Software Specification Document Review

Review the LOLClub Simulation Software Specification Document (SSD) for completeness, clarity, and alignment with project goals. Provide feedback on any areas that require improvement or further clarification.

## Key Review Areas

1. Efficiency & Security
    1. Is the current pre-auth flow (whitelist + OTP + consent) efficient (in terms of software architecture and performance) and secure (against common threats such as replay attacks and data leaks)?
2. Usability & User Experience
    1. Does the onboarding process (OTP + consent) provide a smooth user experience?
        1. Are there any potential friction points that could lead to user drop-off?
        2. Is the process clearly communicated to users (e.g., via progress indicators)?
        3. Are all possible edge cases (e.g., invalid OTP, expired links, navigating back, resending OTP, temporary server errors, etc.) handled gracefully without issues?
    2. Are error messages and guidance clear for users during onboarding?
    3. Are users able to go back to the previous page in any circumstances?
        1. If so, is the state preserved correctly (e.g., re-entering phone number does not require re-verification)?
        2. Is the state management robust enough to handle unexpected user behavior (e.g., navigating back and forth)?
        3. Are there any potential issues with session expiration or data loss during navigation?
3. Consistency
    1. Are the specifications consistent with the overall project goals and requirements?
    2. Do the specifications align with industry best practices and standards (as of the current date)?
    3. Are the specifications consistent with each other and do they avoid contradictions?
    4. Are the specifications aligned with the needs and expectations of stakeholders (e.g., users, developers, business owners, etc.)?
4. Maintainability
    1. Are the specifications maintainable and adaptable to future changes (e.g., through modular design, clear documentation, etc.)?
5. Testability
    1. Are the specifications testable and verifiable (e.g., through user testing, automated tests, etc.)?
6. Completeness
    1. Are the specifications complete and do they cover all necessary aspects of the system (e.g., functional requirements, non-functional requirements, etc.)?
7. Technical Stacks
    1. Are the chosen technical stacks (e.g., frameworks, libraries, tools) appropriate for the project goals and requirements?

## Review format

Write your review as `/.memo/CE/specs/myapp_SSD_review.md`. Include suggestions for improvements or changes where necessary for each key review area.