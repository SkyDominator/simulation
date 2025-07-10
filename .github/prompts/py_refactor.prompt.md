---
mode: ask
description: Refactor the code to improve its structure and readability without changing its functionality.
---

# Refactoring principles

## Development Environment

1. Windows 10 or 11 OS
2. Python 3.10 or later

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
