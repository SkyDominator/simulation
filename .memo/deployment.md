# 배포 시 주의사항

1. origin 변경
   1. backend CORS 세팅 settings
   2. frontend API_BASE_URL (backend origin)
   3. supabase Authentication > URL Configuration : SiteURL, RedirectURL
2. Supabase key (anon, service_role key, secret) env 설정 변경

# Deployment notes (your other Windows 11 notebook)

Use the current Docker Compose to run both services, or build a static production bundle and serve via any static server (over HTTPS recommended).
The SW will precache the app shell. The notices endpoints are runtime-cached with NetworkFirst.
By default, the runtime caching pattern uses VITE_API_BASE_URL if set at build; otherwise it falls back to the current hardcoded API base. For flexibility, build with:
PowerShell:
Avoid caching authenticated endpoints: current config only caches GET /api/notices and static images. All simulation endpoints remain uncached.

# npm install warning

npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated sourcemap-codec@1.4.8: Please use @jridgewell/sourcemap-codec instead
npm warn deprecated source-map@0.8.0-beta.0: The work that was done in this beta branch won't be included in future versions
