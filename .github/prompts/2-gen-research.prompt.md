# The purpose of research

- Understand how the application works.
- Find "all" relevant files.
- Explore causes of explicit/potential bugs, security or performance issues (if possible).

# The research question

Explain the full architecture of my application (`/src/backend/**` and `/src/frontend/**`). Include analysis of explicit and potential UX flows (including edge cases).

# The outcome of research

- Create a `/.memo/CE/research-report.md` file to report your research results.
- The report should include the followings:
  - A summary of findings
  - The details of findings
  - Code map
    - The list of relevant files (with paths)
      - Per file, the list of classes, components, interfaces, and functions (with line numbers)
    - The relationship between different files and components and APIs
    - The data flow inside the application
  - The explicit or potential bugs, security issues, and performance bottlenecks (when compared to the 2025 best practices under the environment described in `/.github/instructions/global.instructions.md` and `/.github/instructions/simulation.instructions.md` )
    - The references to the exact source code file paths and the line numbers

# The examples for references

Refer to the following example reports for guidance on the structure and content of your research report:

- `/.memo/CE/example1-research.md`
- `/.memo/CE/example2-research.md`
