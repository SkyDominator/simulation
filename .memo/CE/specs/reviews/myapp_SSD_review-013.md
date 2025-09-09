# LOLClub Simulation – SSD Review (v0.1.3)

Source Reviewed: `myapp_SSD.md` Version 0.1.0 (post normative language update)
Date: 2025-09-08

---

## 1. Efficiency & Security

Strengths:

- Clear threat modeling (17.5–17.6) and explicit asset ranking (17.2).
- Normative MUST controls now present for rate limits (17.9), logging redaction (17.10), secrets rotation (17.11), retention (17.12), CSP headers (17.16), deterministic simulation engine versioning (20.2).
- Error taxonomy comprehensive (18.3) with outcome code alignment (18.7) – supports standardized logging & analytics correlation.
- Concurrency & pagination rules (18.8) mitigate resource spikes.

Gaps / Risks:

- No explicit statement that password / credential storage is fully delegated to Supabase Auth (implicit; clarify).
- OTP hashing upgrade path (17.7) still “Planned” – elevate timeline and add interim risk note.
- Missing explicit brute-force timing defenses (constant response timing) for OTP verification (implied but not normative).
- CSP still relaxed with `'unsafe-inline'` & `'unsafe-eval'`; deprecation target date not recorded as a concrete calendar date.
- No formal session invalidation strategy for user-initiated logout (if applicable).

Recommendations:

1) Add MUST for constant-time OTP hash compare and uniform error latency.
2) Record target date (YYYY-MM-DD) for removing unsafe CSP directives.
3) Add explicit MUST statement: “All credential management deferred to Supabase; service MUST NOT persist user passwords.”
4) Add security test checklist (header presence, rate limit, OTP lockout) to CI section (23.x) for automated validation.
5) Add abuse monitoring metric: `otp_bruteforce_block_count`.

## 2. Usability & User Experience

Strengths:

- Acceptance criteria cover OTP, consent, simulation flows (16.").
- Error messages standardized with codes; groundwork for localization (18.2).
- OTP resend policy & microcopy (18.4) enhance clarity.

Gaps:

- No wireframe / screen state references; potential ambiguity for edge states (locked OTP, expired consent).
- Missing explicit empty-state UX for simulation list & notices.
- Accessibility section (18.5) is baseline; lacks testing cadence & severity thresholds beyond WCAG contrast.

Recommendations:

1) Add minimal wireframe references or screenshot placeholders for critical states (OTP locked, consent required banner).
2) Define a11y regression gate: “No new axe-core critical violations per PR.” (tie into 23.2).
3) Add UX rule: Show remaining OTP attempts inline after failure.

## 3. Consistency

Strengths:

- Terminology consistent: “engine_version”, “outcome code”, “simulation_run”.
- Normative table constraints (18.1) align with validation & error codes.
- Versioning policies integrated with CHANGELOG governance (20.1–20.5).

Inconsistencies / Minor Issues:

- Data model section (6) trimmed fields (some columns removed vs earlier detailed listing) – potential mismatch with later references (e.g., simulations current_company_round used in API but not listed now).
- Outcome metric naming vs analytics events (19.4) – unify naming (e.g. simulation_run vs simulation_run event field sets).

Recommendations:

1) Restore complete column definitions for `simulations` (include plan_id, rounds fields) for single source of truth.
2) Add cross-reference anchors (e.g., (see 18.3 code=SIMULATION_RATE_LIMIT)).
3) Add table mapping event names → outcome codes where relevant (appendix).

## 4. Maintainability

Strengths:

- OpenAPI snapshot governance & contract test integration (18.6 + 23.3) reduces drift.
- Engine snapshot regression scaffold (20.2) ensures deterministic stability.
- Clear normative MUST language facilitates lint/automation.

Gaps:

- No explicit migration template / checklist (atomicity, rollback notes) aside from high-level rollback section (19.5).
- Audit tables defined but placeholder columns only (need minimal required schema to prevent churn later).
- Lacks dependency update cadence & tooling policy (weekly? monthly?).

Recommendations:

1) Add a “Migration Author Checklist” subsection (preconditions, idempotency, down migration policy, test fixture updates).
2) Flesh out audit table columns (actor, action_type, entity_type, entity_id, metadata JSONB).
3) Add Dependabot / pip-audit & npm audit schedule (e.g., weekly) in CI.

## 5. Standard Adherence

Strengths:

- Uses semantic versioning semantics for API & engine.
- Security controls reflect modern baseline (HSTS, CSP, Referrer-Policy, COOP/COEP planned).
- Error model matches common industry JSON error envelope pattern.

Gaps:

- No explicit privacy/data minimization principles (GDPR-style) though PII footprint is small.
- Accessibility goals not mapped to WCAG 2.1 AA success criteria IDs.

Recommendations:

1) Add privacy principles (data minimization, purpose limitation, deletion guarantees).
2) Add mapping table: Accessibility Requirement → WCAG SC reference.
3) Consider adding Software Bill of Materials (SBOM) generation (CycloneDX) as MUST for supply chain transparency.

## 6. Completeness & Clarity

Strengths:

- Comprehensive error/status matrix; reduces ambiguity for consumers.
- Normative retention & rate limit rules now explicit.
- Versioning, operational playbook, and rollback guidance present.

Gaps / Missing Elements:

- No explicit performance test methodology (tool choice partially noted k6/Locust but not thresholds per endpoint).
- Missing RLS policy outlines (only flagged as planned) – risk of mis-implementation.
- Data model omissions (removed columns vs API contract) may introduce confusion.
- No explicit “Non-Goals” section beyond out-of-scope – helpful to prevent scope creep (e.g., no multi-tenancy, no billing pipeline).

Recommendations:

1) Add RLS policy pseudo-code examples (e.g., `create policy select_simulations for select using (user_id = auth.uid())`).
2) Add performance test acceptance table (endpoint → p95 target) separate from SLO for clarity.
3) Add Non-Goals enumerating intentionally excluded features.
4) Provide example log line (JSON) illustrating outcome_code usage.

## Priority Improvement Backlog (Top 10)

1) Clarify missing columns in Section 6 to match API contracts (prevent drift).
2) Implement OTP HMAC hashing upgrade & document cutover date.
3) Add RLS policy definitions (normative) before production.
4) Add CSP deprecation calendar date & remove unsafe directives.
5) Implement contract + spectral + snapshot jobs end-to-end (ensure failing conditions enforced).
6) Expand audit tables with full schema and integrate retention metrics.
7) Add privacy principles & data minimization statement.
8) Add migration authoring checklist & template.
9) Add a11y regression gate metrics & WCAG mapping.
10) Provide SBOM generation step (CycloneDX) in CI for supply chain transparency.

## Summary

The SSD has substantially improved rigor: security, error modeling, versioning, and governance are well-articulated with normative language. Remaining work centers on closing implementation placeholders (RLS, audit schema), restoring full data model fidelity, and operationalizing controls (hashing upgrade, CSP tightening, privacy principles). Addressing the prioritized items will move the spec from “robust draft” to “production-grade authoritative contract.”

---

End of Review.
