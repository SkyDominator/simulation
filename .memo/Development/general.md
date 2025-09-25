# Important Notes

* Detailed error categorization

# 개발 순서 (from scratch)

1. Write SDD draft
    1. Write the Business requirements
        1. Very simple UI, clear logic, small number of UX flows
        2. Write the core of MVP.
            1. What service does the app provide?
            2. To whom?
            3. What problem does it solve?
            4. What's the value for users?
    2. Ask AI to fill in the technical requirements
        1. Tech stack (frontend, backend, database, 3rd party services, etc.)
        2. High level architecture (components, modules, interactions)
        3. UX flows (detailed)
        4. Database schema, data models, ERD
        5. API contracts (endpoints, request/response formats)
        6. State management (if any)
        7. 3rd party services (if any)
    3. Achieve Basic MVP
        1. Identify the inevitable requirements for the type of app like mine. For example:
            1. service environments
                1. target users
                2. target devices
                3. target OS
                4. target browsers
                5. accessibility(a11y, WCAG, etc)(visual impairment, color blindness, motor impairment, cognitive impairment, etc.)
            2. user auth (sign-up, login, logout, password reset, etc.)
            3. security considerations (auth, data protection, PII handling, etc.)
            4. showing Terms of Service and Privacy Policy agreement to user
            5. updating ToS and PP and re-collecting agreement from user (versioning by admin)
            6. user profile management (viewing/updating user information)
            7. Opt out option for user
            8. OTP authentication
            9.  user activity logging (tracking user actions within the app)
            10. admin panel for managing users and content
            11. CRUD for notices and policies by admin
            12. user feedback and support system (1:1 chat, email, FAQ)
            13. sign-up whitelist management
            14. deployment environments
                1. local
                    1. backend server
                    2. database
                    3. frontend server (WAS)(Webpack dev server, Vite dev server, etc.)
                    4. etc. (Docker, CI/CD, etc.)
                2. staging
                    1. backend server
                    2. database
                    3. frontend server (WAS)(Webpack dev server, Vite dev server, etc.)
                    4. 4. etc. (Docker, CI/CD, etc.)
                3. production
                    1. backend server
                    2. database
                    3. frontend server (WAS)(Nginx, Apache, etc.)
                    4. 4. etc. (Docker, CI/CD, etc.)
                4. testing
                    1. backend server
                    2. database
                    3. frontend server (WAS)(Jest, Cypress, etc.)
                    4. 4. etc. (Docker, CI/CD, etc.)
        2. Business requirements
            1. Very simple UI, clear logic, small number of UX flows
    4. Many details including tech stack can change and be omitted
    5. Abstraction level
        1. Do not include source codes examples(snippets), libraries, frameworks, tools, etc. Include only if it is inevitable and important to understand the app
        2. Rich and detailed UX flows
        3. Should include database schema, data models, ERD
        4. Should include API contracts (endpoints, request/response formats)
        5. Should include state management (if any)
        6. Should include 3rd party services (if any)
2. Continuous Refinement of SDD
    1. Review SDD. Ask marking `NEED_VERIFICATION` on ambiguous parts
    2. Collect feedback
    3. Refine SDD
    4. Repeat 1-3 until SDD is solid and implementable
3. Write (Implementation) Plan draft
    1. For each feature in SDD, break it down into tasks and subtasks
    2. Identify dependencies, prerequisites, 
    3. 
4. Implement the plan