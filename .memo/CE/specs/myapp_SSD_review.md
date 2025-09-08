# LOLClub Simulation – SSD Review (v0.1.0)

Date: 2025-09-08  
Reviewer: Automated review (GitHub Copilot)  
Source Document: `myapp_SSD.md` (Status: Draft)  
Scope of Review: Completeness, clarity, consistency, alignment with goals, maintainability, standards adherence across the six key areas defined in `review-spec.prompt.md`.

---

## Summary Snapshot

| Area | Maturity (Subjective) | Overall Risk if Unaddressed | Priority to Improve |
|------|-----------------------|-----------------------------|---------------------|
| 1. Efficiency & Security | Medium | Elevated (auth, data flows) | High |
| 2. Usability & UX | Medium | Medium (onboarding friction) | High |
| 3. Consistency | Medium-High | Medium | Medium |
| 4. Maintainability | Medium | High (scaling + change) | High |
| 5. Standard Adherence | Medium | Medium | Medium |
| 6. Completeness & Clarity | Medium | High (gaps in NFR coverage) | High |

Legend: "Maturity" is a qualitative assessment of specification depth (not implementation state).

---

## 1. Efficiency & Security

### 1.1 Coverage of Efficiency & Security in UX Flow

#### Strengths (Security)

- Clear delineation of pre-auth vs post-auth stages.
- JWT verification + JWKS mention; least-privilege via RLS implied.
- OTP attempt limiting and basic rate limiting (15‑min window) acknowledged.

#### Gaps / Clarifications Needed

- No explicit performance budgets per critical path (OTP send, simulation run complexity vs `simulation_rounds`).
- Missing caching strategy (e.g., latest published privacy policy, notices list) to reduce backend calls and latency.
- Lacks data flow diagram for security review (e.g., where `user_hash` is generated, stored, transformed).
- No threat model summary (abuse: OTP brute force, enumeration, replay, admin endpoint probing, JWT kid header tampering, supply-chain risks, Cloudflare Tunnel exposure risks).
- No mention of transport security assumptions (HTTPS enforcement, HSTS, TLS versions).
- No explicit input validation rules (phone normalization algorithm, allowed character sets for names, memo length limits, injection defense posture).
- Passwordless / OTP channel: no retention period or purge policy for `phone_otps` and PII minimization strategy.
- Logging policy: states “minimal logging” but lacks: which fields are masked, correlation IDs, log levels, retention.
- Admin authorization: only states existence of `admins` table—needs enforcement pattern (e.g., DB join vs cached in memory vs signed claim).
- No session invalidation / logout handling behavior.
- No policy for rotating Supabase keys or SMS provider credentials.
- No clear separation of concerns for hashing strategies: which algorithm & parameters for OTP code hash, for whitelist user hash (currently sha256 — acceptable but consider peppering & normalization rules).

#### Recommendations (Security)

1. Add a Security & Performance Appendix: include data flow, threat model (STRIDE-lite), and mitigation matrix.
2. Define performance SLOs: OTP send < 1s (excluding provider latency), simulation run baseline for N rounds (e.g., 500 rounds < 1.2s).
3. Add caching strategy (client & server) for static policy + notices.
4. Specify normalization & validation rules (E.164 for phones, Unicode normalization for names, length constraints, allowed plan IDs as enum).
5. Introduce structured error codes (e.g., `OTP_INVALID`, `OTP_EXPIRED`, `CONSENT_MISSING`).
6. Define logging redaction and correlation ID injection.
7. Explicitly document secure headers & TLS assumptions (HSTS, CSP, Referrer-Policy, COOP/COEP if needed later for performance isolation).
8. Clarify key rotation + secret management process (e.g., `.env` → vault migration path).
9. Add retention & purge schedule: `phone_otps` (e.g., purge after 24h), `consent_records` retention requirement (legal?).
10. Add plan for rate limiting expansion (per-IP + per-user for onboarding endpoints, potential WAF rules via Cloudflare).

---

## 2. Usability & User Experience

### 2.1 Smooth Onboarding (OTP + Consent)

#### Strengths

- Linear, minimal-step onboarding (OTP → Consent → OAuth) is clearly stated.
- Gating logic for outdated consent version identified.

#### Gaps

- No explicit UX for error / retry states (e.g., expired OTP vs wrong code vs rate-limited).
- No resend OTP cooldown policy or UI guidance (e.g., "Resend available in 45s").
- Missing accessibility considerations (focus management after validation errors, semantic form markup expectations).
- No locale fallback behavior (non-ko-KR user – future-proofing).
- No microcopy guidelines (tone, language for consent and security messaging).
- Lacks device constraints (mobile-first is noted; no mention of responsive breakpoints or loading skeleton patterns to mitigate perceived latency during onboarding).
- No tracking of partial progress (if user leaves after consent but before OAuth—do we re-ask OTP?).

#### Recommendations (Consistency)

1. Add UX Error State Table: condition → message → recovery (e.g., attempts exceeded, stale consent, network error).
2. Define OTP resend rule (e.g., max 3 resends per 10 min + progressive backoff UI).
3. Add loading skeleton/spinner guidance for simulation run + content fetch.
4. Provide accessibility checklist (WCAG 2.1 AA subset: color contrast, keyboard nav, ARIA labeling for dynamic content, focus ring persistence).
5. Specify phone formatting helper and in-line validation feedback pattern.
6. Document retention of pre-auth progress (localStorage key? expiry?).
7. Provide microcopy style (concise, action-first, Korean tone guidelines if relevant).

### 2.2 Error Messages & Guidance

- Present spec doesn’t enumerate message catalog—risk of inconsistent user feedback.
- Action: define standardized structure: `{title, body, actionLabel?, code}`.

---

## 3. Consistency

### 3.1 Alignment with Project Goals

- Core flows (simulation mgmt, onboarding, admin policy mgmt) align with goals stated in Section 1.
- PWA scope modest and consistent with stated boundaries (not claiming offline-first).

### 3.2 Internal Consistency / Contradictions

#### Findings

- Numbering issue: Two sections labeled “15” (Acceptance Criteria, then Glossary). Appendices labeled “16” → renumber to avoid confusion.
- `simulations` schema lists `investments` vs API create payload uses `scheduled_payment`—need consistency or mapping explanation.
- Business logic references `scheduled_payment` while data model lists `investments` (rename or clarify transformation layer).
- Plans enumerated in multiple places; centralize enumeration for single source of truth.
- `privacy_policies` published default stated as `false` but notices default `published=true`; confirm intentional or unify pattern.
- OTP endpoints reference `expires_in_seconds` but model doesn’t declare TTL derivation (source? env var?).

### 3.3 Stakeholder Alignment

- Engineering needs: migrations, testing strategy, deployment flow—under-specified.
- Product needs: KPI hooks (e.g., adoption, conversion drop-off by onboarding stage) not mentioned.
- Admin needs: audit trail for policy publish/unpublish not defined (who/when)—missing for compliance.

#### Recommendations

1. Fix section numbering.
2. Create a Terminology & Field Mapping table (e.g., `scheduled_payment` ⇄ `investments`).
3. Add audit requirements for admin content changes.
4. Centralize Plan Parameter reference (appendix with versioned plan definitions + checksum?).
5. Document environment variable controlling OTP expiry + attempt limits explicitly (link to NFR).

---

## 4. Maintainability

### 4.1 Adaptability to Future Changes

#### Strengths (Maintainability)

- Clear separation of domain areas (onboarding, simulation, policies).
- Version field in `privacy_policies` supports iterative publishing.

#### Gaps (Maintainability)

- No API versioning strategy (URL vs header vs tolerant evolution).
- No migration/versioning policy for simulation engine parameters (how to preserve historical results if algorithm changes?).
- Missing testing strategy section (unit, property-based for simulation math, load tests, contract tests for API stability).
- No CI/CD outline (linting, type checks, test stages, security scans, SAST/Dependency vulnerability scanning).
- No error taxonomy or structured error object spec—harder to maintain consistent client handling.
- Lacks guidance on code modularization (e.g., service layering, dependency boundaries, anti-corruption layer for Supabase client wrappers).
- No observability expansion path (metrics: OTP success rate, simulation run time distribution, consent lag, admin operations).

#### Recommendations (Maintainability)

1. Add “Maintainability & Evolution” section: API deprecation policy, semantic version alignment with DB migrations.
2. Introduce Simulation Engine Versioning: embed `engine_version` in `simulation_results`.
3. Specify minimal test matrix: Python (unit, simulation invariants), Frontend (component + e2e for onboarding), contract tests (OpenAPI snapshot diff).
4. Add dependency governance: renovation schedule, pinned vs caret strategy.
5. Provide guideline for adding new plan types (checklist: add constants, update validation, update docs, add test fixtures).
6. Add metrics plan: latency histograms, OTP attempt counters, consent adoption rate, simulation error ratio.

---

## 5. Standard Adherence

### 5.1 Alignment with Best Practices (2025)

#### Positive

- PWA minimal baseline (manifest + SW) acknowledged.
- RLS principle for user isolation.
- Use of JWT JWKS rather than static secrets.

#### Missing / Improvements

- Accessibility (WCAG 2.1) considerations absent.
- Security frameworks: no mapping to OWASP ASVS / MASVS levels.
- Privacy: no mention of data minimization, DSR (data subject request) handling for consent removal.
- Crypto: hashing description (algorithm, salting/peppering) absent—should specify and justify.
- Logging & monitoring: structured logging standard (JSON) not declared.
- PWA: no guidance on offline fallback page or graceful degradation strategy.
- No explicit Content Security Policy (CSP) baseline.
- No mention of supply chain / dependency scanning or integrity (e.g., npm lockfile auditing, pip dependency pinning & vulnerability scanning).

#### Recommendations (Standards)

1. Add Accessibility Checklist summary in spec + link to internal docs.
2. Add Security Posture Mapping (ASVS L1/L2 coverage) to make expectations explicit.
3. Document hash functions (e.g., `sha256` + optional pepper for whitelist; OTP hash maybe HMAC-SHA256 with server secret to avoid storing raw).
4. Define base CSP (script-src 'self' https://*.supabase.co). Evaluate stricter policies later.
5. Introduce dependency scanning (e.g., GitHub Dependabot + scheduled vulnerability audit run).
6. Add Privacy Compliance stub: data export/delete flows future placeholder.
7. Consider adopting OpenAPI spec generation for formal contract (makes alignment easier).

---

## 6. Completeness & Clarity

### 6.1 Coverage of Necessary Aspects

#### Covered

Core functional flows, major tables, high-level business logic, non-functional performance/security placeholders.

#### Not Fully Covered / Missing Sections

- OpenAPI / schema reference (formal) missing.
- Error model & HTTP status code matrix.
- Rate limiting exact numeric thresholds (only partial reference for OTP send attempts; no per-IP/per-user per endpoint values).
- Concurrency & consistency expectations (e.g., what happens if two memo updates race?).
- Data retention & archival (policies, historical simulation immutability guarantees).
- Backup / restore / disaster recovery RPO/RTO assumptions.
- Deployment environments (dev/stage/prod) & config variance.
- Monitoring & alerting triggers (health endpoint alone is insufficient).
- SLA/SLO vs SLI definitions.
- State management decision (guidance: which library and why) only deferred—should at least list evaluation criteria.
- Internationalization posture (explicitly deferred but consider minimal hook design).
- Privacy policy publish/unpublish workflow state diagram.
- Admin role escalation / removal process.
- Pagination, sorting defaults for list endpoints (e.g., `/api/simulations`, `/api/notices`).
- Validation constraints (max lengths, numeric bounds). Risk: inconsistent constraints between frontend/backend.

### 6.2 Redundancies / Simplifications

- Duplicate section numbering (two 15s) — adjust.
- Some Acceptance Criteria restate API contract; can consolidate by referencing contract section to reduce drift.
- Combine Sections 11 (PWA) + relevant NFR subsections into an "Application Delivery & Client Capabilities" section if brevity desired.
- Glossary is short; could be merged into Appendices if document length becomes unwieldy.

#### Recommendations (Completeness & Clarity)

1. Add Error & Status Code Matrix Appendix.
2. Add OpenAPI generation step (e.g., FastAPI auto-doc snapshot commit hook) and reference it instead of partial manual listing.
3. Provide validation constraints table (field → type → min/max / regex / nullable).
4. Add retention & compliance table per table (e.g., `phone_otps`: 24h purge; `consent_records`: indefinite/legal retention).
5. Provide list endpoint defaults (page size, order field, stable ordering guarantee).
6. Add concurrency note (optimistic locking? `updated_at` check?).
7. Include deployment environment matrix (feature flags, log level, debug toggles).

---

## Prioritized Action Plan (Top 12)

1. Fix numbering inconsistencies; unify terminology (`scheduled_payment` vs `investments`).
2. Add Security & Performance Appendix (threat model + SLOs + rate limits table).
3. Introduce structured error & status code matrix.
4. Define validation + constraints table (critical for frontend alignment & preventing security issues).
5. Add OTP resend policy & user-facing error microcopy guidelines.
6. Document logging & monitoring standards (PII redaction, correlation IDs, metrics).
7. Add simulation engine versioning + immutability policy for historical results.
8. Provide admin action audit requirements (publish/unpublish tracking fields: who, when).
9.  Introduce Accessibility & Internationalization minimal checklist (even if i18n deferred).
10. Add retention & purge policies for OTP + onboarding-related transient data.
11. Provide OpenAPI formal spec reference and automate regeneration (reduces drift risk).
12. Add dependency & secret rotation policy summary.

---

## Suggested Structural Additions

- Section: 17. Security & Performance Appendix
- Section: 18. Validation & Error Model
- Section: 19. Operational Playbook (Deploy, Monitor, Rollback)
- Section: 20. Versioning & Evolution (API, Simulation Engine, Policy Content)

---

## Sample Tables to Add (Illustrative)

### Rate Limiting (Proposed)

| Endpoint Group | Limit | Window | Scope | Notes |
|----------------|-------|--------|-------|-------|
| OTP Send | 3 | 15 min | phone+IP | Exponential backoff UI |
| OTP Verify | 6 | 15 min | phone | After lock: require resend |
| Onboarding Link | 10 | 1 h | user_id | Protect from automation |
| Simulation Run | 30 | 10 min | user_id | Prevent abuse / cost control |

### Field Validation (Excerpt)

| Field | Type | Constraints | Reject Reason Code |
|-------|------|------------|--------------------|
| phone_number | string | E.164, length 10–15 | PHONE_FORMAT_INVALID |
| plan_id | enum | A\|B\|C\|D\|K\|P\|R\|F\|E | PLAN_UNSUPPORTED |
| simulation_rounds | int | 1–1000 (proposed) | SIM_ROUNDS_OOB |
| memo | string or null | max 1000 chars | MEMO_TOO_LONG |

---

## Document Quality Observations

- Style: Generally consistent, concise; could benefit from explicit normative keywords (MUST/SHOULD/MAY) to reduce interpretation ambiguity.
- Traceability: Acceptance criteria partially map to API; consider a Requirements Traceability Matrix (RTM) later if compliance grows.
- Version Control: Add commit hash of source of generation to header for reproducibility.

---

## Conclusion

The SSD establishes a solid foundational outline of domain flows and primary data models. To progress from draft to implementation-grade specification, it needs deeper coverage in security hardening, error/validation modeling, maintainability strategy, and operational considerations. Addressing the prioritized action plan will materially reduce future rework and production risk.

---

## Quick Checklist of Added Recommendations (Tick as Implemented)

- [ ] Numbering fixed
- [ ] Terminology/table mapping added
- [ ] Threat model + SLOs
- [ ] Error/status matrix
- [ ] Validation constraints table
- [ ] Logging & monitoring standards
- [ ] OTP resend & attempt UX defined
- [ ] Simulation engine versioning
- [ ] Admin audit fields
- [ ] Retention & purge policies
- [ ] OpenAPI spec integration
- [ ] Accessibility baseline
- [ ] Dependency & secret rotation policy

---

End of Review.
