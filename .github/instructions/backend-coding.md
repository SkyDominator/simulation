## Back-end Coding Guidelines

Follow the general guidelines below when writing Python codes.

### General Guidelines

1. Single Responsibility & SOLID Principles
    - Apply the **Single Responsibility Principle (SRP)** in all codes.
    - Adopt broader **SOLID** principles for modular and maintainable code:
        - **OCP**: Open for extension, closed for modification.
        - **LSP**: Subtypes should work in place of base types.
        - **ISP**: Interfaces should be lean and focused.
        - **DIP**: Depend on abstractions, not concrete implementations. Use dependency injection wherever applicable.
2. Modular Design
    - Break code into **small, focused functions and classes**—each should do one thing well
    - Organize files and folders by **features or domains**, not types—this keeps the codebase intuitive and scalable.
    - Enhance Maintainability
        - Use design patterns where appropriate to solve common problems.
        - Ensure that modules have clear interfaces and are loosely coupled.
    - Improve Reusability
        - Identify and extract common functionality into reusable components or functions.
        - Encourage the use of shared libraries or modules to avoid code duplication.
    - Increase Flexibility and Scalability
        - Design systems that can easily adapt to changing requirements.
        - Use configuration files or environment variables to manage settings and parameters.
    - Promote Testability
        - Write code that is easy to test in isolation.
3. Documentation
    - Add docstrings to functions and classes, and inline comments where necessary to explain complex logic.
4. Error Handling
    - Implement detailed, structured, and categorized exceptions for appropriate error handling, ease of debugging, and ease of test code implementation.
    - Implement custom error classes where appropriate to represent specific error conditions.
    - Implement logging for errors to aid in debugging and monitoring.
    - Use try-except blocks to handle exceptions gracefully and provide meaningful error messages.
5. API Status handling
    - Implement appropriate status codes for API responses to indicate success or failure.
        - 200: Successful GET operations
        - 201: Successful POST/PUT operations
        - 400: Business logic validation errors
        - 401: Missing or invalid authentication
        - 403: Insufficient permissions (admin required)
        - 404: Resource not found
        - 422: Request validation errors
        - 500: Server errors
5. Performance
    - Optimize code for performance where applicable, but prioritize readability and maintainability.
6. Dependencies
    - If new libraries are introduced, ensure they are documented and included in the requirements file. Use context7.
7. Security
    - Be mindful of security best practices, especially when handling user input or sensitive data.
8. Refactoring
    - If you encounter code that can be improved, refactor it while ensuring existing functionality remains intact.
9. Functionality
    - Ensure that the code meets the specified requirements and behaves as expected.
10. Monitoring and Logging
    - Implement logging where appropriate to aid in debugging and monitoring application behavior.
    - Use structured logging to capture relevant context and metadata.
11. Others
    - Follows Python best practices for ambiguious cases.
    - Use meaningful variable and function names.
    - Try to make each function "pure", meaning it should not have side effects and should return the same output for the same input.
    - Avoid deep nesting of code blocks.  
    - Use type hints to improve code readability and help with static analysis.
    - Use context7 MCP.
    - Use dataclasses or pydantic to simplify class definitions and improve readability.
    - Use f-strings for string formatting for better readability and performance.
    - Use list comprehensions and generator expressions for concise and efficient iteration.