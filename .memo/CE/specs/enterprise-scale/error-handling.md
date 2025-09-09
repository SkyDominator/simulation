# Comprehensive Error Handling & Validation (Enterprise Scale)

*Extracted from myapp_SSD.md - Section 18*  
*Target: 10,000+ users or public-facing applications*

## 18.1 Validation Constraints (Comprehensive)

| Domain | Field | Type | Constraints (Min/Max/Format) | Required | Notes |
|--------|-------|------|--------------------------------|----------|-------|
| User | name | string | 1..50, Unicode NFC | Yes (verify-user, otp) | Normalize whitespace |
| User | phone_number | string | E.164, length 10..15 | Yes | Normalized before hashing |
| OTP | otp_code | string | 6 digits (^[0-9]{6}$) | Yes (verify) | Reject leading zeros? (No) |
| Simulation | plan_id | enum | A,B,C,D,K,P,R,F,E | Yes | Validate against constant set |
| Simulation | starting_company_round | int | 1..100 | Yes | Must be <= current_company_round |
| Simulation | current_company_round | int | 1..100 | Yes | >= starting round |
| Simulation | simulation_rounds | int | 1..100 | Yes | Hard cap to prevent abuse |
| Simulation | scheduled_payment | object | keys round:int -> amount: >=0 int | Yes | Validate total sum < configurable cap |
| Simulation | sales_achievement_rates | object | round:string -> 50..100 int | Optional | If absent default plan baseline |
| Simulation | memo | string | 0..1000 chars | Optional | Null allowed to clear |
| Policy | version | string | ^v?[0-9]+\.[0-9]+\.[0-9]+$ (semver) | Yes | Leading v optional |
| Policy | locale | string | ^[a-z]{2}-[A-Z]{2}$ | Yes | Default ko-KR |
| Consent | consent_type | string | whitelist: privacy_policy | Yes | Enum expansion gated |
| Consent | consent_version | string | As policy.version | Yes | Must match published version |
| Onboarding | consent_version | string | As policy.version | Conditional | Only if consent recorded |

## 18.2 Structured Error Object

All error responses MUST return HTTP status != 2xx with JSON body:

```json
{
  "error": {
    "code": "OTP_INVALID",
    "message": "The code you entered is incorrect.",
    "details": { "remaining_attempts": 2 },
    "trace_id": "<uuid>"
  }
}
```

Fields:

- `code` MUST be an UPPER_SNAKE identifier defined in Section 18.3.
- `message` MUST be present (localization-ready, default ko-KR).
- `trace_id` MUST correlate to request logs.
- `details` MAY provide structured context and MUST NOT expose secrets or PII beyond masked identifiers.

## 18.3 Error & Status Code Matrix (Comprehensive)

| Endpoint | Scenario | HTTP | code | Message (EN draft) | Notes |
|----------|----------|------|------|--------------------|-------|
| POST /api/verify-user | Not whitelisted | 404 | USER_NOT_WHITELISTED | User not found | Generic to avoid enumeration |
| POST /api/verify-user | Invalid phone format | 400 | VALIDATION_ERROR | Invalid phone number format. | Field errors in details |
| POST /api/otp/send | Rate limit exceeded | 429 | OTP_SEND_RATE_LIMIT | Too many requests. Try again later. | Retry-After |
| POST /api/otp/send | SMS provider failure | 502 | OTP_PROVIDER_FAILURE | Failed to send code. Retry shortly. | Provider hidden |
| POST /api/otp/send | Not whitelisted | 404 | USER_NOT_WHITELISTED | User not found | Same semantics as verify-user |
| POST /api/otp/verify | Wrong code | 400 | OTP_INVALID | Incorrect code. | remaining_attempts included |
| POST /api/otp/verify | Expired | 400 | OTP_EXPIRED | Code expired. Request a new one. | |
| POST /api/otp/verify | Attempts exhausted | 423 | OTP_LOCKED | Too many attempts. Request new code. | Locked until resend |
| POST /api/otp/verify | Rate limit exceeded | 429 | OTP_VERIFY_RATE_LIMIT | Too many verification attempts. | |
| GET /api/privacy-policy | Version not found | 404 | POLICY_NOT_FOUND | Policy version not found. | |
| POST /api/consents | Version mismatch | 409 | CONSENT_VERSION_MISMATCH | Supplied version not current. | Refresh required |
| POST /api/consents | Invalid consent_type | 400 | VALIDATION_ERROR | Invalid consent type. | |
| GET /api/consents/{user_hash} | Not found | 404 | CONSENT_NOT_FOUND | No records for user. | Expected early onboarding |
| POST /api/onboarding/link | Missing prior consent | 409 | CONSENT_REQUIRED | Re-accept current policy. | Blocks linking |
| POST /api/onboarding/link | Already linked | 200 | (none) | Already linked. | Idempotent |
| GET /api/onboarding/status | Not linked yet | 200 | (none) | success true with flags | Normal path |
| POST /api/simulation/create | Invalid plan | 400 | PLAN_UNSUPPORTED | Unsupported plan id. | |
| POST /api/simulation/create | Rounds out of bounds | 400 | SIM_ROUNDS_OOB | simulation_rounds out of bounds. | |
| POST /api/simulation/create | Payment total too large | 400 | PAYMENT_TOTAL_EXCEEDED | Total scheduled payment exceeds cap. | |
| GET /api/simulations | Unauthorized | 401 | UNAUTHORIZED | Authentication required. | |
| GET /api/simulations/{id} | Not owner | 403 | FORBIDDEN | Access denied. | |
| GET /api/simulations/{id} | Not found | 404 | SIMULATION_NOT_FOUND | Simulation not found. | |
| POST /api/simulation/run | Engine version mismatch | 409 | ENGINE_VERSION_MISMATCH | Engine updated; re-run required. | |
| POST /api/simulation/run | Concurrency cap reached | 429 | SIMULATION_RATE_LIMIT | Too many concurrent runs. | |
| PATCH /api/simulations/{id} | Concurrent update | 409 | CONFLICT_MODIFIED | Simulation changed; reload. | optimistic lock |
| PATCH /api/simulations/{id} | Validation fail | 400 | VALIDATION_ERROR | Field constraints violated. | Field list in details |
| PATCH /api/simulations/{id}/memo | Memo too long | 400 | MEMO_TOO_LONG | Memo length exceeds limit. | |
| DELETE /api/simulations/{id} | Not found | 404 | SIMULATION_NOT_FOUND | Simulation not found. | |
| DELETE /api/simulations/{id} | Not owner | 403 | FORBIDDEN | Access denied. | |
| POST /api/admin/privacy-policies | Duplicate version | 409 | POLICY_VERSION_EXISTS | Version exists. | |
| POST /api/admin/privacy-policies/{id}/publish | Already published | 409 | POLICY_ALREADY_PUBLISHED | Policy already published. | |
| POST /api/admin/privacy-policies/{id}/publish | Not found | 404 | POLICY_NOT_FOUND | Policy not found. | |
| PATCH /api/admin/privacy-policies/{id} | Published immutable | 409 | POLICY_PUBLISHED_IMMUTABLE | Cannot modify published policy. | |
| GET /api/admin/privacy-policies/{id} | Not found | 404 | POLICY_NOT_FOUND | Policy not found. | |
| GET /api/admin/me | Not admin | 403 | FORBIDDEN | Admin privileges required. | |
| POST /api/admin/notices | Validation fail | 400 | VALIDATION_ERROR | Invalid notice fields. | |
| PATCH /api/admin/notices/{id} | Not found | 404 | NOTICE_NOT_FOUND | Notice not found. | |
| DELETE /api/admin/notices/{id} | Not found | 404 | NOTICE_NOT_FOUND | Notice not found. | |
| DELETE /api/admin/notices/{id} | Not admin | 403 | FORBIDDEN | Admin privileges required. | |
| GET /api/notices/{id} | Not found | 404 | NOTICE_NOT_FOUND | Notice not found. | |
| GET /api/health | Degraded | 200 | HEALTH_DEGRADED | Service degraded. | Include latency metrics |
| Any | Validation error | 400 | VALIDATION_ERROR | Invalid request payload. | |
| Any | Method not allowed | 405 | METHOD_NOT_ALLOWED | Method not allowed. | Framework default |
| Any | Unauthorized | 401 | UNAUTHORIZED | Authentication required. | |
| Any | Forbidden | 403 | FORBIDDEN | Access denied. | |
| Any | Rate limited | 429 | RATE_LIMITED | Too many requests. | Generic fallback |
| Any | Not found | 404 | NOT_FOUND | Resource not found. | Generic fallback |
| Any | Internal error | 500 | INTERNAL_ERROR | Unexpected error occurred. | trace_id logged |

**Maintenance:** New endpoints MUST append a row and update OpenAPI responses. Removing or changing semantics of an existing code MUST trigger a major API version bump (see 20.1). 

**Cross-References:** SIMULATION_RATE_LIMIT & ENGINE_VERSION_MISMATCH (Section 18.8 Pagination & Concurrency Policies), CONFLICT_MODIFIED (Optimistic locking policy Section 18.8), POLICY_VERSION_EXISTS / POLICY_ALREADY_PUBLISHED (Policy lifecycle Section 20.3), and ENGINE_VERSION_MISMATCH (Engine governance Section 20.2). 

When introducing a new code implementers MUST: (a) add to this matrix, (b) add an outcome code if user-visible state change, (c) update Appendix 22.1 Event→Outcome mapping, (d) extend contract tests for negative path coverage.

## 18.4 OTP Resend Policy & UX Microcopy

**Policy:**

- Initial send: immediate.
- Cooldown between resends: 60s (show countdown).
- Max resends per 10 minutes: 3 (OTP_SEND_RATE_LIMIT if exceeded).
- Expiry: 5 minutes from creation.
- Attempts: 6 attempts per code; after exhaustion require new OTP.

**Microcopy (ko-KR baseline examples):**

- Sending: "인증 코드를 전송 중입니다..."
- Sent success: "인증 코드가 전송되었습니다. 유효 시간은 5분입니다."
- Resend disabled: "재전송 가능까지 {seconds}초 남았습니다."
- Wrong code: "코드가 올바르지 않습니다. 다시 시도하세요. (남은 시도 {remaining_attempts}회)"
- Expired: "코드가 만료되었습니다. 새 코드를 요청하세요."
- Locked: "시도 가능 횟수를 초과했습니다. 새 코드를 요청하세요."

## 18.5 Accessibility & Internationalization (Minimal Checklist)

| Area | Baseline Requirement |
|------|----------------------|
| Color Contrast | All text/background pairs WCAG 2.1 AA (contrast ≥ 4.5:1) |
| Focus Management | Focus ring visible; programmatic focus on error summary & dialogs |
| Keyboard Nav | All interactive elements reachable via Tab; skip links supported |
| Semantics | Forms use labels; ARIA only for gaps; no div-only buttons |
| Error Announce | Live region (aria-live polite) for form errors & success messages |
| Motion | Avoid layout shift on OTP field; reserve space for errors |
| I18n Prep | All user-visible strings behind translation function `t(key)` placeholder; default ko-KR; no concatenated dynamic strings |
| Date/Number | Use locale-aware formatting utilities |

## 18.6 OpenAPI Specification Integration

- Snapshot path: `docs/api/openapi.snapshot.json` (authoritative committed contract) and MUST be present on main.
- Regeneration (local): `curl -s http://localhost:8000/openapi.json > docs/api/openapi.snapshot.json` (backend running) OR programmatic extraction. Generation MUST be reproducible.
- CI pipeline:
  1. Run tests.
  2. Fetch live spec → temporary file.
  3. Diff with snapshot. If drift: fail unless snapshot + CHANGELOG updated.
  4. Spectral lint for style / completeness (e.g., error responses present, tag naming).
  5. (Optional) Generate TS types: `npx openapi-typescript docs/api/openapi.snapshot.json -o src/frontend/src/types/api.ts`.
- Contract tests MUST validate representative negative paths return matrix-defined error codes (Section 18.3) and MUST fail the pipeline on drift.
- Backward compatibility rules:
  - Additive optional fields: non-breaking.
  - Removal / required field addition / semantic change: breaking (major version bump Section 20).
  - Deprecations: mark with `deprecated: true` and add CHANGELOG entry.

## 18.7 Structured Outcome Codes

Outcome codes unify logs & analytics and MUST align with error matrix codes where applicable: `SUCCESS`, `VALIDATION_ERROR`, `RATE_LIMITED`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT_MODIFIED`, `INTERNAL_ERROR`, `ENGINE_VERSION_MISMATCH`, `SIMULATION_RUN_COMPLETED`, `POLICY_PUBLISHED`, `OTP_INVALID`, `OTP_EXPIRED`, `OTP_LOCKED`. 

Introducing a new outcome code MUST add logging + dashboard updates.

## 18.8 Pagination & Concurrency Policies

| Topic | Policy | Rationale |
|-------|--------|-----------|
| Default page size | 50 | Balanced payload & latency |
| Max page size | 200 | Prevent large scans |
| Pagination style | Offset+limit (initial) | Simplicity; evaluate cursor later |
| Sorting (simulations) | created_at desc | Stable recency ordering |
| Sorting (notices) | created_at desc | Recency priority |
| Concurrency (sim runs) | 1 active run/user (MUST enforce) | Prevent CPU spikes |
| Conflict detection | updated_at compare → 409 | Optimistic locking semantics |
| Rate-limited run error | SIMULATION_RATE_LIMIT | Communicate retry condition |
| Engine mismatch | ENGINE_VERSION_MISMATCH | Ensures deterministic expectations |

Clients SHOULD refetch entity on 409 and MUST handle 429 by delaying retries using backoff (1s, 2s, 4s...). Server MUST supply appropriate status codes and SHOULD include a diagnostic message.
