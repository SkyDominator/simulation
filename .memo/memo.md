
I have further questions.

1. How did you decide that the test codes should
2. Why the frontend test coverage is only around 20%? 
3. For the chosen files and codelines for test, how they were chosen? On what criteria?


Given this, there are some issues in the current codes:

1. sessionStorage.setItem("onboarding.userHash", userHash); should be removed in hadleVerify in OtPVerificationPage since sessionStorage.setItem("onboarding.userHash", userHash); is already and should be only done in whitelistcheck page. It's the marker for passing whitelist check, not that of OPT verification. It should be something that represents the OTP verification success.

2. I think the onVerified in WhitelistCheckPage, OtPVerificationPage, and AppController use phone as argument which seems to be not need. 

3. The page routing logic in AppController page is not working as expected:

Expectation:

The onboarding status should be checked when routing users. If a user's auth session is terminated (logged out),  his onboarding status should be checked to decide which page he should be redirected to. 

If he already passed all the requirements (whitelist check, OTP verification, and consent to the latest version of the privacy policy), he should be redirected to the "login" page.

If he passed OTP verification (it automatically includes whitelist checking in the current logic) but the privacy policy version he consented is not the lastest, he should be redirected to the ConsentPage for getting consent to the latest version. Only after that, he would be redirected to the login page.

If he hadn't gone through OTP verification or the valid time of the OTP verfication (`otp_validity_minutes` in settings.py) was over, he should be redirected to the whitelist check page.

And of course, if there is a valid auth session, he should be routed to the main page.




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