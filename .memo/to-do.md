I will go with NHN Cloud – SMS (TOAST) as it is the cheapest. Can you show the way from scratch about how to implement implement SMS OTP Authentication for my app developer environment? It would be great if it is a paste-ready.

For your reference, The landing page UI (React) of my app (a progressive web app) collects user's name and phone number, and in my backend the combination of these two is hashed (for not storing private info in my backend and DB) and this hashed value is compared against the existing hash value in a supabase DB table called "whitelist" (column: user_hash). If the two hashed value exactly matches, then it can be said that the user passed the white list check.

After that (=after passing the white list check), my app currently shows a privacy policy consent UI and gets the user agreement and record it on another table called "consent_records". As only the user who passed the white list check can go for the privacy policy consent, the consent_records table has its primary key "user_hash".  

Only after a user passed the white list check and agreed to the privacy consent (=the existence of a row in consent_records table), this user can go to the next step: the social login page (Google, KakaoTalk).

This is the current authentication process for my app.

The change I want to make on this process is adding a "SMS Authentication (OTP)" between the white list check step and the privacy policy consent step. After the user enters his name and phone number on the landing UI (=the white list check page) and the hashed value is verified against the value on "whitelist" table, I want SMS OTP authentication step takes place at the very next step. 



# 그 외

1. 메모장 밖에 화면 누르면 메모 화면 꺼지는 현상 수정
2. 현재 회사 회차 입력하는 단계를 step에 추가.
3. 현재 회사 회차를 가지고 현재 회사 회차 이후의 종합 결과만 보여주는 별도 보고서 화면 추가 (토글 버튼으로 1회차부터, 현재 회차부터)