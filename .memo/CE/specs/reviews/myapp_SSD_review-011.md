# LOLClub Simulation – SSD Review (v0.1.1)

Date: 2025-09-08  
Reviewer: Automated review (GitHub Copilot)  
Source Document: `myapp_SSD.md` (Version: 0.1.0 Draft)  
Scope: Re-evaluate after structural additions (Sections 17–22) per `review-spec.prompt.md` focusing on completeness, clarity, consistency, maintainability, efficiency & security, standard adherence.

---

## Delta Since v0.1.0 Review

Implemented in SSD:

- Added Section 17 Security & Performance Appendix (threat model, SLOs, rate limits, logging, key mgmt, retention, validation subset, procedures, acceptance tests).
- Added Section 18 Validation & Error Model (comprehensive constraints table, structured error object, status code matrix, OTP resend policy, accessibility & i18n checklist, OpenAPI workflow, outcome codes).
- Added Section 19 Operational Playbook (deployment workflow, monitoring & alerting runbook, audit logging requirements, user analytics, rollback, metrics dashboard).
- Added Section 20 Versioning & Evolution (API versioning rules, simulation engine versioning, policy version lifecycles, migration governance, CHANGELOG discipline, compatibility testing).
- Added Section 21 Glossary (expanded) & Section 22 Appendices.
- Introduced explicit retention & purge policy table (now 17.12) and OTP resend microcopy.

Remaining / Newly Exposed Gaps:

- Some recommendations implemented only partially (see per-area details).
- Simulation engine versioning is declared but not yet tied to concrete schema changes in `simulations` (no explicit column shown for `engine_version`).
- OpenAPI integration process described but no committed snapshot path yet (placeholder path not created) and no tooling/lint references (Spectral, etc.).
- Audit logging requirements listed but not mapped to physical tables / schema DDL.
- Accessibility checklist present (18.5) but lacks conformance testing approach or tooling (e.g., axe-core integration plan).
- Error matrix is “Excerpt” (not exhaustive); some endpoints (delete simulations, admin notice CRUD) omitted.

---

## Summary Snapshot

| Area | Maturity (Spec Depth) | Improvement vs v0.1.0 | Residual Risk | Priority Next |
|------|-----------------------|------------------------|---------------|--------------|
| 1. Efficiency & Security | Medium-High | ↑ Significant (threat model, SLOs) | Implementation drift | Medium |
| 2. Usability & UX | Medium | ↑ (OTP resend, microcopy examples, accessibility checklist) | Missing full message catalog | High |
| 3. Consistency | High | ↑ (renumbered, structured sections) | Plan parameter centralization | Medium |
| 4. Maintainability | Medium-High | ↑ (versioning, playbook) | Test strategy absent | High |
| 5. Standard Adherence | Medium | ↑ (accessibility, retention, versioning) | CSP/ASVS mapping absent | Medium |
| 6. Completeness & Clarity | Medium-High | ↑ (error model, validation tables) | Some endpoints not in matrix | Medium |

Legend: Up arrows indicate improvement; residual risk describes potential future rework if not addressed.

---

## 1. Efficiency & Security

### 1.1 Coverage Assessment

Strengthened by explicit SLOs (17.8), rate limits (17.9), threat model (17.6), and operational procedures (17.14). Data retention (17.12) now mitigates PII exposure for OTPs. Logging spec (17.10) defines redaction and metric families.

### Gaps

- No formal concurrency / resource exhaustion mitigation strategy for simultaneous simulation runs (queueing/back-pressure not defined beyond rate limits).
- Brute-force OTP mitigation relies on rate + attempts; no mention of silent increasing delay or jitter to slow automated attacks.
- No CSP, HSTS, or security headers baseline enumerated.
- Secret rotation workflow described (17.11) but no explicit “grace period / dual secret” pattern for OTP HMAC rotation.
- Threat model doesn’t enumerate supply-chain or dependency pinning attack scenarios beyond a note (could map to mitigations explicitly).

### Recommendations

1. Add Security Headers subsection: CSP (script-src 'self' *.supabase.co), Referrer-Policy, X-Content-Type-Options, Permissions-Policy minimal baseline.
2. Add OTP incremental backoff formula note (e.g., after 3 failed attempts, impose 2s incremental delay).
3. Define Simulation concurrency policy: max N parallel runs per user; optional global cap.
4. Document dual-secret rotation pattern for OTP HMAC (old+new accept window).
5. Add explicit supply chain controls (lockfile integrity check in CI, dependency signature verification optional future).

---

## 2. Usability & User Experience

### 2.1 Improvements

- OTP resend policy & microcopy (18.4) clarifies user timing expectations.
- Accessibility & i18n checklist (18.5) gives baseline guardrails.

### 2.2 Gaps

- No global message/error catalog centralizing messages by code (only examples in matrix & microcopy).
- No design tokens or responsiveness breakpoints documented (tying to MUI theme values) for consistency.
- Page dwell analytics model (19.4) exists, but no privacy note on anonymization method / opt-out handling.
- Guidance for empty states / loading skeletons missing.

### 2.3 Recommendations

1. Introduce a Message Catalog Appendix: code → default ko-KR → optional EN draft.
2. Add UI Loading & Skeleton Guidelines for simulation run & list fetches.
3. Clarify pseudonymization method (hashing user_id? salted?) in analytics for privacy.
4. Document theme breakpoints and minimal target tap size (mobile accessibility).

---

## 3. Consistency

### 3.1 Improvements

- Section numbering aligned; governance sections grouped logically.
- Validation constraints unify field-level expectations (18.1) reducing backend/frontend drift.

### 3.2 Gaps

- Plan parameters (business constants) still referenced conceptually; not centralized in spec as authoritative structure or checksum.
- Error matrix not exhaustive and labeled “Excerpt” (risk of future inconsistency for omitted endpoints).

 
### 3.3 Recommendations
1. Add Plan Parameters Appendix: table listing per plan values (plus a version/hash for integrity checks).
2. Expand Error Matrix to cover all CRUD (delete, list endpoints) and admin notice operations.
3. Clarify where `engine_version` persists (table/column) to ensure consistency with versioning statement.

---

## 4. Maintainability

 
### 4.1 Improvements
- Versioning & Evolution (20.x) sets semantic boundaries (API, engine, policy) and migration governance.
- Operational Playbook adds deploy + rollback repeatability.

 
### 4.2 Gaps
- No explicit test strategy or coverage goals (unit, integration, contract, load, accessibility automated tests).
- No CI pipeline definition (stages, required checks, fail conditions). 
- No schema migration guidelines (forward-only, rollback risk classification, naming conventions).
- OpenAPI integration lacks toolchain (how snapshot generated, command, diff tooling, spectral lint rules).

 
### 4.3 Recommendations
1. Add Testing Strategy section: target coverage %, critical path test matrix (OTP, consent, simulation run), contract tests referencing OpenAPI.
2. Add CI/CD pipeline outline (jobs: lint/type check, tests, security scan, OpenAPI snapshot diff, build & push).
3. Add Migration Policy: naming (YYYYMMDD_description.sql), idempotency expectations, backward compatibility notes.
4. Include Make/Invoke tasks (e.g., `make openapi.snapshot`).

---

## 5. Standard Adherence

 
### 5.1 Improvements
- Accessibility baseline + retention policies raise compliance maturity.
- Structured error object standard (18.2) aligns with common REST patterns.

### Gaps
- No mapping to OWASP ASVS controls; crypto use (SHA256, HMAC) not justified vs alternatives.
- No privacy compliance placeholders (DSR handling, data minimization statement) beyond retention.
- No statement regarding performance budgets vs Core Web Vitals for PWA.
- Missing explicit logging standards for levels (INFO, WARN, ERROR criteria).

### Recommendations
1. Add mini ASVS mapping table (selected controls & coverage status).
2. Add Privacy Commitments subsection (data export/delete handling in future stage, PII minimization justification for stored fields).
3. Add Core Web Vitals targets (LCP < 2.5s median, CLS < 0.1, INP < 200ms internal baseline).
4. Define Log Level Policy (when to escalate severity, sampling for noisy endpoints if needed).

---

## 6. Completeness & Clarity

### Improvements
- Validation & Error Model consolidates constraints and error semantics.
- Operational metrics & audit requirements bring transparency to run-time governance.

### Gaps
- Backup & disaster recovery (RPO/RTO) unspecified.
- Pagination/sorting defaults for list endpoints still missing (affects consistency & performance for growth).
- Concurrency / optimistic locking mention only in one error (CONFLICT_MODIFIED) but no general rule.
- No explicit environment matrix for config variance (e.g., rate limit ratios dev vs prod).

### Recommendations
1. Add RPO/RTO targets (e.g., RPO 24h, RTO 4h for internal stage) or note dependency on Supabase defaults.
2. Document list endpoint defaults: page size (e.g., 50), order (created_at desc), stable sort fields.
3. Provide standard optimistic concurrency approach (etag, updated_at precondition) or explicitly defer.
4. Add Environment Configuration Matrix (DEV vs PROD: log level, rate limit leniency, debug flags).

---

## Action Plan (Updated Tracking)

| # | Item | Status | Next Step |
|---|------|--------|-----------|
| 3 | Structured error & status code matrix | Partial | Make exhaustive + include delete/admin ops |
| 4 | Validation + constraints table | Implemented (Comprehensive) | Keep in sync with OpenAPI generator |
| 5 | OTP resend policy & microcopy | Implemented | Add dynamic cooldown UI spec |
| 6 | Logging & monitoring standards | Implemented (baseline) | Add log level policy + sampling |
| 7 | Simulation engine versioning | Partial | Add schema column + migration note |
| 8 | Admin audit requirements | Partial | Provide table DDL + field types |
| 9 | User action audit requirements | Partial | Pseudonymization method + retention rationale |
| 10 | Accessibility & i18n checklist | Implemented (baseline) | Add tooling strategy (axe-core CI) |
| 11 | Retention & purge policies | Implemented | Link to backup strategy + legal hold notes |
| 12 | OpenAPI formal spec integration | Partial | Add snapshot file & CI diff job |
| 13 | Dependency & secret rotation policy | Partial | Add automation schedule & dual-secret pattern |

---

## High-Impact Next Steps (Top 6)
1. Formalize schema updates: add `engine_version` column + audit tables (DDL) to spec.
2. Complete error matrix (all endpoints) and integrate into OpenAPI responses.
3. Add Testing & CI Pipeline sections (contract tests + accessibility scan).
4. Define Security Headers & CSP baseline.
5. Add Pagination/Sorting defaults & concurrency policy.
6. Create OpenAPI snapshot artifact path and workflow steps.

---

## Observations on Document Quality
- Structure now mirrors a production-ready specification skeleton; risk now shifts from missing sections to ensuring ongoing synchronization (version drift).
- Normative language still mostly descriptive; consider MUST/SHOULD keywords for non-negotiable controls (rate limits, retention windows, hashing algorithms).
- Appendices separation is effective; potential to move large operational tables to a `docs/operations` subfolder later.

---

## Conclusion
The SSD has progressed substantially toward a robust governance and operational specification. Remaining gaps are mainly about executable rigor (test strategy, schema DDL, exhaustive matrices) and formal compliance posture. Addressing the prioritized next steps will reduce ambiguity for implementation and ease future audit or externalization efforts.

---

## Checklist of Recommendations (Tick as Completed During Iteration)
- [x] Security & Performance Appendix
- [x] Validation & Error Model section
- [x] Operational Playbook
- [x] Versioning & Evolution
- [x] Retention & purge policies
- [x] OTP resend policy
- [x] Accessibility checklist
- [ ] Complete error matrix (all endpoints)
- [ ] Add engine_version schema + audit DDL
- [ ] OpenAPI snapshot artifact & CI diff
- [ ] Security headers & CSP
- [ ] Testing strategy & CI stages
- [ ] Pagination & concurrency policies
- [ ] Message catalog centralization

---

End of Review (v0.1.1).
