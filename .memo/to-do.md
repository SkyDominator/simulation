# 그 외

1. 메모장 밖에 화면 누르면 메모 화면 꺼지는 현상 수정
2. ~~현재 회사 회차 입력하는 단계를 step에 추가.~~
3. 현재 회사 회차를 가지고 현재 회사 회차 이후의 종합 결과만 보여주는 별도 보고서 화면 추가 (토글 버튼으로 1회차부터, 현재 회차부터)
4. admin 모드 구현 (admin이 플랜 시뮬레이션 생성, 수정 가능한 모드)
5. ~~policy를 md 문서로 관리~~
6. policy 변경 시 모든 유저 로그아웃 시키고 다시 동의받게 하는 것

    1.  Add admin CRUD endpoints for policies (create/update/publish) like Notices admin. But, the two privileges should be separated. reusing your admin checks

    So this is a task of adding authority level management. Fpr instance, An "owner" level admin account is allowed to edit notices and policy, but "operator" level admin account is only allowed to edit notices but not policy.   



1. CI/CD 구현
2. windows 서비스 형태로 구현
3.  OTP
   1. OTP를 최초 접속 한 번만 하는 것으로 변경
   2. OTP-동의-로그인 플로우 재정리
   3. time-left indicator UI 추가
   4. ~~provider_msg_id DB에 저장하는 로직 추가~~
   5. 플로우 정리 후 더 가격이 싼 (NHN Cloud) 기반으로 변경
   6. ~~이미 OTP 인증된 상태에서 로그아웃하면 다시 로그인 화면으로 돌아가도록 수정~~
    7. Re-consent on policy version bump (compare consent_version).
        1. Onboarding gating: After session is present, call api.getOnboardingStatus(session.access_token) and:
If consent_version missing/outdated → route to consent.
Else continue to main; optionally show a “Complete onboarding” banner if flags are false.
    8. UI hints/guard rails (e.g., show “Complete onboarding” if missing).
    9.  Optional server-side enforcement before protected operations (e.g., block simulation run if consent missing).
    10. Restore-session check: On visibility/focus, call supabase.auth.getSession() and only consider redirecting to whitelist after a short debounce if session is truly absent.

1.  for frontend:
    1.  useEffect에서 클린업을 사용해 unmount한 컴포넌트가 setState를 호출하고 memory leak를 일으키는 일을 방지하고 있는지 프론트엔드 코드 전체 점검 필요.
        1.  This is a "cleanup pattern" for effects with async side effects. It prevents stale closures or updates on unmounted components.
2. Security. Replace sessionStorage bridge with an OAuth state param + backend ephemeral store for maximum safety. That requires a small backend addition to stash state keyed by the OAuth state value.
3. Security. Run security check on my codes and DB schema. Which data can be stored in the DB as plain text and which should be encrypted? 
4. Security. When and how a login session is expired(destroyed?) It is crucial because since a login session survives it no longer requires white list check and OTP authentication.