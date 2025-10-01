Apply my decisions about the Important Clarifications in clarity review to the test code plan files:

1. test-code.md

* Add concise table enumerating exit code semantics in main plan & tooling plan.

2. test-plan-02-backend-integration.md

* Provide env flag RETAIN_TEST_SCHEMA=1 to skip teardown on failure.

3. test-plan-01-backend-unit.md

* Monkeypatching all RNG may inadvertently break unrelated libs later: Document the followings in the test plan file for narrowing down the monkeypatching scope: 

Instead of patching RNG globally, limit the monkeypatching to the simulation module's namespace only:

1. Patch random.random only when it's imported or called within the specific simulation module (e.g., via a context manager or import hook).
2. This ensures the guard only enforces determinism in the relevant code, leaving other parts of the system unaffected.

4. test-plan-04-frontend-unit.md

* localStorage key names not specified: Define keys (e.g., sim.draft / onboarding.state) so tests align.

5. test-plan-05-frontend-integration.md

* States whitelist and consent—ensure actual implemented route names or context states match: Add mapping table: Logical State → Route / Component name. Refer to `/src/frontend/**` for actual names.

6. test-plan-09-pii-policy.md

* Only glob exclusions; no positive allowlist for fixture folder: Use only glob exclusions, no positive allowlist for fixture folder. Add explicit allowlist file for edge cases only.

7. test-plan-07-performance.md

* Define number of repetitions. Define repetitions=5, report median.
