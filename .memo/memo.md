# Best prompt patterns

1. Raise question
    1. If there are things that need to be clarified by myself (when there are multiple best practice options or when it is a matter of taste, of future environment, or of future implementation, etc.), stop writing plan and just raise me questions with the listing and the explanations for each list item about the possible best options.
2. Tag `NEED_VERIFICATION` on ambiguous parts
    1. If there are things that need to be clarified by myself (when there are multiple best practice options or when it is a matter of taste, of future environment, or of future implementation, etc.), stop writing plan and just tag `NEED_VERIFICATION` on the ambiguous items.
3. Refine loop
    1. There are 3 steps in total, and you will loop through them until no issue-suggestion pair (except `NEED_DECISION` tagged items) is found in the new $REVIEW_FILE.
        1. Review
        2. Refinement
        3. Goes back to Step 1, and repeat Steps 1~3
4. Format consistency
    1. When modifying [SSD](/.memo/CE/specs/SSD.md), maintain the structure, format, and the style used in the original text. After the suggested change was applied to the original contents, the contents structure and flow should be natural as it was created as it is, not modified interim. So, do not use the expressions that emphasize the changes you made in any way, unless explicitly instructed to do so. Provide the final output as if it was originally written that way.

I have further questions.

1. How did you decide that the test codes should
2. Why the frontend test coverage is only around 20%? 
3. For the chosen files and codelines for test, how they were chosen? On what criteria?

# Enterpise-level test codes

1. backend
    1. unit test
        1. service layer (business logic)
        2. data access layer (DB interaction)
        3. utility functions
        4. auth/JWT validation logic
    2. integration test
        1. API endpoints (using test client)
        2. DB integration (using test database)
        3. external service integration (SMS/Solapi, Supabase)
    3. contract testing
        1. API contracts between frontend/backend
        2. schema validation tests
2. frontend
    1. unit test
        1. React components (rendering, props, state)
        2. utility functions
        3. custom hooks
    2. integration test
        1. critical user flows
        2. API interaction tests (mocked backend)
    3. E2E test
        1. major user journeys
        2. PWA-specific features (offline, install, caching)
3. performance test
    1. backend API response times & load testing
    2. frontend Core Web Vitals (LCP, FID, CLS)
    3. PWA performance (service worker, cache efficiency)
4. security test
    1. authentication/authorization flows
    2. OWASP Top 10 vulnerabilities
    3. PII data handling & encryption
    4. rate limiting (especially OTP endpoints)
5. accessibility test
    1. WCAG 2.1 AA compliance
    2. keyboard navigation
    3. screen reader compatibility
6. cross-browser/device test
    1. desktop browsers (Chrome, Edge, Firefox, Safari)
    2. mobile browsers (iOS Safari, Chrome Android)
    3. PWA installation & behavior on different platforms
7. monitoring & observability
    1. error tracking (Sentry/Datadog)
    2. performance monitoring (real user metrics)
    3. API health checks
8. test automation
    1. CI/CD pipeline integration
    2. automated regression suite
    3. coverage reports (backend 80%+, frontend 70%+)

# Small app

## MUST-HAVE Tests (Critical Path)

1. backend essentials
    1. unit tests for critical business logic only
        - OTP service (rate limiting, validation)
        - simulation calculations
        - auth/JWT validation
    2. basic API smoke tests
        - happy path for all endpoints
        - auth protection verification

2. frontend essentials
    1. smoke tests for main user flows
        - login/logout flow
        - core business features (simulation CRUD)
    2. manual testing checklist
        - test on 2 browsers (Chrome desktop + mobile)
        - verify PWA installation works

3. security basics
    1. auth endpoints are protected
    2. PII data not exposed in logs/responses
    3. rate limiting on OTP works

4. simple automation
    1. pre-commit hooks (linting, basic tests)
    2. basic CI pipeline (run tests on PR)

## If time allows: (Non-Critical Path)

5. monitoring
    1. basic error logging (console or simple service)
    2. uptime monitoring

6. performance
    1. manual check of load times
    2. verify offline mode works for PWA

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




# 그 외

1. 메모장 밖에 화면 누르면 메모 화면 꺼지는 현상 수정
2. 결과/종합 보고서 UI
   1. 더 쉬운 컬럼명
   2. 컬럼명 마우스 호버링 시 쉽고 자세한 설명
3. ~~현재 회사 회차 입력하는 단계를 step에 추가.~~
4. 현재 회사 회차를 가지고 현재 회사 회차 이후의 종합 결과만 보여주는 별도 보고서 화면 추가 (토글 버튼으로 1회차부터, 현재 회차부터)
5. admin 모드 구현 (admin이 플랜 시뮬레이션 생성, 수정 가능한 모드)
6. ~~policy를 md 문서로 관리~~
7. policy 변경 시 모든 유저 로그아웃 시키고 다시 동의받게 하는 것

   1. Add admin CRUD endpoints for policies (create/update/publish) like Notices admin. But, the two privileges should be separated. reusing your admin checks

   So this is a task of adding authority level management. Fpr instance, An "owner" level admin account is allowed to edit notices and policy, but "operator" level admin account is only allowed to edit notices but not policy.


8. CI/CD 구현
9. windows 서비스 형태로 구현
10. OTP
11. OTP를 최초 접속 한 번만 하는 것으로 변경
12. OTP-동의-로그인 플로우 재정리
13. time-left indicator UI 추가
14. ~~provider_msg_id DB에 저장하는 로직 추가~~
15. 플로우 정리 후 더 가격이 싼 (NHN Cloud) 기반으로 변경
16. ~~이미 OTP 인증된 상태에서 로그아웃하면 다시 로그인 화면으로 돌아가도록 수정~~
17. Re-consent on policy version bump (compare consent_version). 1. Onboarding gating: After session is present, call api.getOnboardingStatus(session.access_token) and:
    If consent_version missing/outdated → route to consent.
    Else continue to main; optionally show a “Complete onboarding” banner if flags are false.
18. UI hints/guard rails (e.g., show “Complete onboarding” if missing).
19. Optional server-side enforcement before protected operations (e.g., block simulation run if consent missing).
20. Restore-session check: On visibility/focus, call supabase.auth.getSession() and only consider redirecting to whitelist after a short debounce if session is truly absent.

21. for frontend:
    1. useEffect에서 클린업을 사용해 unmount한 컴포넌트가 setState를 호출하고 memory leak를 일으키는 일을 방지하고 있는지 프론트엔드 코드 전체 점검 필요.
       1. This is a "cleanup pattern" for effects with async side effects. It prevents stale closures or updates on unmounted components.
22. Security. Replace sessionStorage bridge with an OAuth state param + backend ephemeral store for maximum safety. That requires a small backend addition to stash state keyed by the OAuth state value.
23. Security. Run security check on my codes and DB schema. Which data can be stored in the DB as plain text and which should be encrypted?
24. Security. When and how a login session is expired(destroyed?) It is crucial because since a login session survives it no longer requires white list check and OTP authentication.
25. Flickering issue due to re-rendering. (TBD)
26. 결과에 세전 수당 합계 표시
27. last_updated 사용하지 않고 updated_date만 사용하도록 변경

4.  for frontend:
    1.  useEffect에서 클린업을 사용해 unmount한 컴포넌트가 setState를 호출하고 memory leak를 일으키는 일을 방지하고 있는지 프론트엔드 코드 전체 점검 필요.
        1.  This is a "cleanup pattern" for effects with async side effects. It prevents stale closures or updates on unmounted components.

5. 테스트 코드 구현

관리 기능:

1. 누가 언제부터 접속해서 어디까지 있었는가 등 사용자 행동 데이터
2. 사용자 행동 데이터 추적에 따른 약관 업데이트


# 배포 시 주의사항

1. origin 변경
   1. backend CORS 세팅 settings
   2. frontend API_BASE_URL (backend origin)
   3. supabase Authentication > URL Configuration : SiteURL, RedirectURL
2. Supabase key (anon, service_role key, secret) env 설정 변경
   1. Backend (server-side, secret)
      1. SUPABASE_URL
      2. SUPABASE_SECRET_KEY ← new (preferred)
      3. Optional: SUPABASE_PUBLISHABLE_KEY (not required server-side)
   2. Frontend (Vite build-time, public)
      1. VITE_SUPABASE_URL
      2. VITE_SUPABASE_PUBLISHABLE_KEY