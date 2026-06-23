# Security and Privacy Review

This repository was prepared for portfolio sharing with anonymization and secret hygiene checks.

## What Was Sanitized

- Replaced product-specific branding with generic names.
- Replaced production/staging domains with placeholder domains (`app.example.com`, `staging-app.example.com`).
- Removed personal contact values from runtime UI.
- Removed unused deployment artifacts that referenced infrastructure details:
  - `cloudflared-config.yaml`
  - `docker-compose.production.yml`
  - `docker-compose.staging.yml`
  - `src/backend/Dockerfile`
  - `src/frontend/Dockerfile`

## Secret Scan Summary

Scans were run against active source code for common secret patterns:

- Private key headers (`BEGIN ... PRIVATE KEY`)
- Cloud/API token signatures (AWS/GitHub/Google/Slack style)
- Hardcoded credential assignments (`SUPABASE_SECRET_KEY`, `SOLAPI_API_SECRET`, etc.)

Result: no hardcoded credentials were found in active app source.

## Operational Security Recommendations

- Keep real credentials only in runtime secret managers or local `.env` files excluded from Git.
- Rotate production credentials before publishing if this repository was previously private but shared across collaborators.
- Ensure GitHub Actions secrets/variables are reviewed and scoped to minimum required permissions.

## Commit History Note

This cleanup updates the working tree. It does not rewrite prior Git history.

If older commits may contain sensitive data, perform a history rewrite before making the repository public:

- Use `git filter-repo` or BFG Repo-Cleaner.
- Force-push rewritten history.
- Invalidate/rotate any credentials that were ever committed.
