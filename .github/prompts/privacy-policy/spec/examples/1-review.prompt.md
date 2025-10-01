---
mode: agent
tools: ['codebase', 'usages', 'problems', 'fetch', 'searchResults', 'githubRepo', 'editFiles', 'search', 'context7', 'pylance mcp server', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand']
---

# Software Specification Document Review

Read thoroughly the following review areas and review the Software Specification Document (SSD) `/.memo/CE/specs/myapp_SSD.md`. Provide feedback on any areas that require improvement or further clarification.

# Review Areas

## Background

A Software Specification Document (SSD) is a comprehensive technical document that defines the requirements, architecture, and implementation details for a software system. As of 2025, SSDs have evolved to be:

* Living documents that integrate with CI/CD pipelines and are auto-generated from source code
* API-first specifications often tied to OpenAPI schemas and contract testing
* Security-conscious with threat modeling and compliance requirements built-in
* Cloud-native aware with considerations for microservices, containers, and managed services
* Accessibility and internationalization ready from the start

## SSD Coverage Guidelines

### Coverage Width

* Functional Requirements (what the system does)
    * UX flows
    * User roles and permissions
    * Data models and relationships
* Non-functional Requirements (performance, security, scalability)
* API Contracts and data models
* Architecture and system design
* Security and authentication flows
* Error handling and validation
* Deployment and operational considerations

### Coverage Depth

* High-level for stakeholder alignment
* Medium-detail for implementation guidance
* Deep-detail only for critical/complex components
* Reference links to detailed implementation docs


### The most important question to ask:

*Does it fit to the Goals & Environments?*

1. Does the SSD align with the project goals?
2. Does the SSD exactly match the app environments (e.g., target devices, target OS, target web browsers,  target users, etc.)? The SSD should scale exactly, not including over-engineering nor under-engineering.

## Review format

Write your review as `/.memo/CE/specs/myapp_SSD_review-020.md` (SSD Review (v0.2.0)). Include suggestions for improvements or changes where necessary for each key review area.