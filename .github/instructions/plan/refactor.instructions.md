# Refactoring criteria

* Code is not modularized enough to be tested effectively.
* Code has too many dependencies that make it hard to isolate the unit of code to be tested.
    * Code is too tightly coupled.
    * Code has too many global states.
* Code has too many side effects that make it hard to test the code in isolation.
* Code is not following the best practices for testability (e.g., hard-coded values, lack of interfaces, etc.).
* Code is not following the best practices for maintainability (e.g., lack of comments, inconsistent naming conventions, etc.).
* Code is not following the best practices for readability (e.g., long functions, deep nesting, etc.).