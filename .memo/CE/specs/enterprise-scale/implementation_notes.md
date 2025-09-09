# Implementation Notes (Low-level DB & infra tips)

This document contains low-level implementation guidance and SQL snippets that are intentionally separated from the high-level SSD. The SSD remains focused on API contracts, canonical schemas, and MUST/SHOULD/OPTIONAL decisions. Use these notes as an implementation reference only.

## Postgres / Supabase SQL snippets

-- Administrative actions (publish, create, delete)
create table if not exists audit_admin_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- User events (privacy-aware usage analytics)
create table if not exists audit_user_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

-- Optional: store historical simulation outputs if multiple versions need retention beyond latest
create table if not exists simulation_results_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

## Triggers & index notes

- Consider adding triggers on `privacy_policies` to keep `updated_at` synchronized with `effective_date` or manual updates. Keep triggers simple and idempotent.
- Index guidance:
  - `phone_otps` should have indexes on `phone`, `created_at`, and a composite on `(phone, used, expires_at)` to optimize lookup for latest unused code.
  - `simulations` may need indexes on `user_id` and `created_at` for listing and retention operations.

## Secrets & HMAC guidance for OTP

- OTP storage should keep only HMAC(code, otp_secret) and not the plaintext. Use a versioned OTP secret so you can rotate secrets with overlap during rotation.
- OTP rows should include `secret_version` to allow dual-version validation during rollout.

## Migration & deployment tips

- When deploying migrations that add/deprecate columns used by APIs, coordinate the following steps:
  1. Add new columns and default values (backwards compatible).
  2. Update backend to write to both old and new columns (if keeping compatibility) or to map names at the API boundary.
  3. Run a traffic cutover and smoke tests.
  4. Remove legacy columns in a later migration after consumers finish migration.

## Notes

- Keep this file under `.memo/CE/implementation_notes.md` as a living reference. Do not include low-level SQL in the SSD; the SSD should remain the authoritative spec for contracts and schema fields.
