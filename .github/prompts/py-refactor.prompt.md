---
mode: agent
description: Refactor the code to improve its structure and readability without changing its functionality.
---

Refactor the provided Python code to improve its structure and readability while maintaining the same functionality. Follow the refactoring guidelines below.

## Basic Requirements

1. Strictly follow the SOLID (SRP, OCP, LSP, ISP, DIP) rule.
2. Write each function and class "pure", as much as possible. 
   - Avoid side effects, such as modifying global variables or using mutable default arguments.
   - Use return values instead of modifying input arguments.
   - Ensure that functions and classes are reusable and testable.
3. Apply type hinting to all functions and classes.
4. Use logging module for logging errors, warnings, and info.
5. Use Windows System Environment Variables for loading API key
6. Use `__init__.py` to define the package structure and import necessary modules.
7. Separate constants, configurations, and utility functions into their own modules.

## Code Review

After refactoring, you should review the result of refactoring. Ensure that the code is reviewed for:

1. Produce exactly the same output as before.
2. Maintainability and extensibility.
   - Ensure that the code is modular and easy to understand.
3. Proper error handling and logging.
4. Performance optimizations and efficiency improvements.
5. Clarity and readability of the code.
