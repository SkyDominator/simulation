# 그 외

1. 메모장 밖에 화면 누르면 메모 화면 꺼지는 현상 수정
2. 현재 회사 회차 입력하는 단계를 step에 추가.
3. 현재 회사 회차를 가지고 현재 회사 회차 이후의 종합 결과만 보여주는 별도 보고서 화면 추가 (토글 버튼으로 1회차부터, 현재 회차부터)

TODO:
otp_service 188 라인 수정해야함.
user_hash = hashlib.sha256(normalized_phone.encode('utf-8')).hexdigest()

--- brief version ---

I want to replace the current whitelist check process with SMS OTP authentication. Follow the development guide below to implement SMS OPT authentication.

# High-level flow (end-to-end, step-by-step)

1. Client requests an OTP for a phone number (e.g., POST /auth/otp/send with phone).
2. Backend validates the phone (format, rate limits, account rules).
3. Backend generates a cryptographically random numeric code (e.g., 6 digits).
4. Backend stores a representation of the OTP (not plaintext), expiry, attempt counters, metadata (IP, provider message id).
5. Backend sends the code to the number via a SMS provider (NHN Cloud - Toast).
6. User receives SMS and submits the code in the client. Mobile platforms may auto-fill.
7. Backend verifies the submitted code against stored data (constant-time compare), checks expiry and attempt limits.
8. On success: mark OTP used. Let users proceed to social login.
   On failure: increment attempt counter and enforce lockout after threshold.

# Core pieces you (as full-stack dev) must build

- OTP generator (secure RNG + formatting).
- Storage model (OTP record → hashed / HMAC'd, expiry, attempts, used flag).
- SMS sending layer (pluggable provider client with retry/backoff + DLR handling).
- Verification endpoint with constant-time comparison and rate-limits.
- UX hooks: resend button, time-left indicator, auto-fill support.
- Observability: logs (but never log plaintext OTP), metrics (send rate, failure rate, deliverability).

# Verification logic (stepwise)

1. Lookup the latest unused OTP for the phone where now < expires_at.
2. If none, respond “invalid or expired” (do not reveal which).
3. If attempts ≥ allowed (e.g., 3), deny and require resend/lockout.
4. Compute expected_hash = HMAC(secret, phone|submitted_code). Compare with stored hash using constant-time.
5. On match: mark as used, let users proceed to social login.
6. On mismatch: increment attempts, maybe enforce exponential backoff or lock after N tries.

# UX & platform details

- Message text: keep it short and machine-readable. Example: `MyApp verification code: 123456`
- Character encoding: Korean or other Unicode increases SMS segments and cost; keep messages ASCII/numeric when possible.

# Compliance & privacy

- Phone numbers are PII. Store minimal metadata, encrypt at rest if required, and apply retention policies. In some jurisdictions you must register messaging content or sender IDs. For Korea, expect sender-registration rules and content review for certain message types. (Plan for legal/regulatory checks when you choose provider.)

# Minimal security policy recommendations (configurable)

- OTP length: 6 digits
- Expiry: 3–5 minutes
- Attempts: 3 allowed per issued OTP
- Resend limit: 3 sends per 15 minutes, 10 per day
- Lockout after suspicious activity: 24 hours or require secondary verification
- Store only code_hash; do not log plaintext; store provider IDs and delivery status.

# Short note on Supabase / FastAPI integration (since your stack uses them)

- You can keep Supabase Auth for session management and use a **Send SMS Hook** that calls your FastAPI endpoint. The endpoint issues the OTP and calls the SMS provider.
