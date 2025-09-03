# 그 외

1. 메모장 밖에 화면 누르면 메모 화면 꺼지는 현상 수정
2. ~~현재 회사 회차 입력하는 단계를 step에 추가.~~
3. 현재 회사 회차를 가지고 현재 회사 회차 이후의 종합 결과만 보여주는 별도 보고서 화면 추가 (토글 버튼으로 1회차부터, 현재 회차부터)
4. admin 모드 구현 (admin이 플랜 시뮬레이션 생성, 수정 가능한 모드)
5. ~~policy를 md 문서로 관리~~
6. policy 변경 시 모든 유저 로그아웃 시키고 다시 동의받게 하는 것
    1. : If you want to surface the policy version/date in the UI, I can add a small line under the dialog title.

    Stub admin endpoints reusing your admin checks.

    Next, I can add admin endpoints to create/update/publish policies (mirroring your Notices admin guard), plus a tiny seeding script if you want.

    Great! Now, I'd like to add the following features you mentioned:

    2. Surface the policy version/date in the UI, and add a small line under the dialog title.
    3.  Add admin CRUD endpoints for policies (create/update/publish) like Notices admin. But, the two privileges should be separated.

    So this is a task of adding authority level management. Fpr instance, An "owner" level admin account is allowed to edit notices and policy, but "operator" level admin account is only allowed to edit notices but not policy.   



7. CI/CD 구현
8. windows 서비스 형태로 구현
9.  OTP
   1. OTP를 최초 접속 한 번만 하는 것으로 변경
   2. OTP-동의-로그인 플로우 재정리
   3. time-left indicator UI 추가
   4. ~~provider_msg_id DB에 저장하는 로직 추가~~
   5. 플로우 정리 후 더 가격이 싼 (NHN Cloud) 기반으로 변경
