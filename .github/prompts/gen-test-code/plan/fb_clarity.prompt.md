Apply my decisions about the clarity review to the test code plan files:

1. test-plan-01-backend-unit.md

* Decide: (a) keep only correctness + structural assertions in Task 10 (drop timing)
* Define snapshot schema and version bump rule, and update the plan file. Refer to `/src/backend/**` and `/.memo/CE/specs/schema/schema.md` for snapshot schema.
* The canonical value: 36.
* JWT negative path behavior: 

| Negative Path | Exception/Return Contract |
|---------------|--------------------------|
| Missing `kid` | Throw `InvalidTokenException` with message "Missing 'kid' in JWT header." |
| Duplicated `kid` | Throw `InvalidTokenException` with message "Duplicated 'kid' values in JWT header." |
| Unsupported `alg` | Throw `UnsupportedAlgorithmException` with message "Unsupported algorithm: {alg}." |
| `aud` mismatch | Throw `AudienceMismatchException` with message "Audience mismatch: expected {expected_aud}, got {actual_aud}." |
| Malformed token segments | Throw `MalformedTokenException` with message "Malformed JWT token segments." |
| Invalid base64 | Throw `InvalidBase64Exception` with message "Invalid base64 encoding in JWT." |
| Expired (`exp` past) | Throw `TokenExpiredException` with message "JWT token has expired." |
| Not-yet-valid (`nbf` future) | Throw `TokenNotYetValidException` with message "JWT token is not yet valid." |

* 

2. test-code.md

* Add the plan tasks for creating apply.py + tasks.py before integration test implementation.

3. test-plan-02-backend-integration.md

* Add mapping table path→method validated against routes. Refer to `/src/backend/api/routes.py`
* Document config injection point. It would be a python file like object for test overrides. Refer to  `/src/backend/config/settings.py`
* Document canonical protected endpoint. Refer to `/src/backend/api/routes.py` to find out which are protected (need authentication)

4. 	test-plan-04-frontend-unit.md

* Specify contract per status code:

| Status Code | Contract |
|------------|----------|
| 200 | Success: parse JSON response and update UI |
| 400 | Client error: display user-friendly message from response.error field |
| 401 | Unauthorized: redirect to login page |
| 403 | Forbidden: show access denied message |
| 423 | Locked: show consent required message |
| 404 | Not found: display not found page |
| 500 | Server error: show generic error message and log details |

5. test-plan-08-coverage-reporting.md

* Output paths unspecified: `/src/test/**`

6. test-plan-07-performance.md

* peak_memory method not specified: Use memory_profiler (`pip install memory_profiler`)

7. test-plan-10-tooling-automation.md

* Threshold source unspecified: Use `config.json` in the same directory as the script.

```json
// filepath: config.json
{
  "successThreshold": 90,
  "errorThreshold": 5,
  "rationale": "Success threshold based on industry standards; error threshold prevents false positives."
}
```

8. test-plan-06-e2e-smoke.md

* Unstable text selector risk: Adopt `data-testid` attributes in the HTML and use them in selectors.
    * Example: `<h1 data-testid="app-header">Welcome to PartnerClub</h1>` and use `page.getByTestId('app-header')` in Playwright.