---
mode: agent
tools: ['codebase', 'usages', 'problems', 'fetch', 'searchResults', 'githubRepo', 'editFiles', 'search', 'context7', 'pylance mcp server', 'getPythonEnvironmentInfo', 'getPythonExecutableCommand']
---

# The guideline for generating a software specification document

This guide will introduce the steps to generate a Software Specification Document (SSD) of my application from the app source codes. I know, it is a kind of a reverse engineering for creating a SSD. Follow the steps below to generate the SSD for my app.

1. Read `./memo/CE/def-spec-common.md` to understand the common structure and content of a software specification document.
2. Read `./memo/CE/def-sepc-myapp.md` to understand the requirements specific to my application.
3. Go through the all source codes of my application (`../../src/backend/**`, `../../src/frontend/**`) to fully understand my project.
    1. Identify every component, module, and every interaction within the codebase for complete understanding.
4. Combine the insights and knowledge gathered so far, create a SSD for my app, and save it to `./specs/myapp_SSD.md`. You can refer to the following examples for guidance on the structure and content of the SSD:
    * `./memo/CE/example1-spec.md`
    * `./memo/CE/example2-spec.md`