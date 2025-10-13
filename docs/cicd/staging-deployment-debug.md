# Staging Deployment Debug Report

**Date**: October 13, 2025  
**Issue**: Staging site deployed but whitelist check fails with DNS error  
**URL**: https://staging-simulation.lightoflifeclub.com

---

## Problem Summary

Staging deployment is successful and containers are running, but the frontend is making API calls to the wrong subdomain:

- ❌ **Frontend trying to call**: `staging.simulation.lightoflifeclub.com/api/otp/send`
- ✅ **Correct URL should be**: `staging-simulation.lightoflifeclub.com/api/otp/send`

**Error in Browser Console**:
```
staging.simulation.lightoflifeclub.com/api/otp/send:1 Failed to load resource: net::ERR_NAME_NOT_RESOLVED
OTP send error: TypeError: Failed to fetch
```

---

## Infrastructure Status

### Container Health
```bash
root@ubuntu-s-1vcpu-1gb-sgp1-01:/srv/lol/simulation/staging# docker ps
NAMES                         STATUS                      PORTS
simulation_frontend_staging   Up 16 minutes (unhealthy)   0.0.0.0:4173->80/tcp
simulation_backend_staging    Up 16 minutes (healthy)     0.0.0.0:8001->8000/tcp
```

**Note**: Frontend shows "unhealthy" due to health check configuration, but container is running and serving pages.

### Backend Health
```bash
root@ubuntu-s-1vcpu-1gb-sgp1-01:/srv/lol/simulation/staging# curl http://localhost:4173/health
{"status":"ok","services":{"supabase":{"ok":true,"latency_ms":216.82,"error":null}},"timestamp":"2025-10-13T07:12:09.007164Z"}
```
✅ Backend is fully operational and can connect to Supabase.

### Direct Backend API Test
```bash
root@ubuntu-s-1vcpu-1gb-sgp1-01:/srv/lol/simulation/staging# curl -X POST http://localhost:8001/api/otp/send \
  -H 'Content-Type: application/json' \
  -d '{"name":"테스트","phone_number":"010-1234-5678"}'
# Returns 422 validation error (expected - whitelist check would fail)
# But the endpoint is responding correctly
```
✅ Backend API endpoints are accessible and responding.

---

## Configuration Verification

### 1. Environment Variables (.env file)
**Location**: `/srv/lol/simulation/staging/.env`

```bash
root@ubuntu-s-1vcpu-1gb-sgp1-01:/srv/lol/simulation/staging# cat .env
ENV=staging
VITE_API_BASE_URL=https://staging-simulation.lightoflifeclub.com/api
VITE_SUPABASE_URL=https://kihlqhomsychihwzwzuo.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_URL=https://kihlqhomsychihwzwzuo.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SECRET_KEY=***
SOLAPI_API_KEY=***
SOLAPI_API_SECRET=***
SOLAPI_SENDER_NUMBER=***
OTP_SECRET_KEY=***
```
✅ Correct subdomain `staging-simulation` in .env file.

### 2. Docker Compose Configuration
**Location**: `/srv/lol/simulation/staging/docker-compose.staging.yml`

```bash
root@ubuntu-s-1vcpu-1gb-sgp1-01:/srv/lol/simulation/staging# docker compose -f docker-compose.staging.yml config | grep -A5 'VITE_API_BASE_URL'
VITE_API_BASE_URL: https://staging-simulation.lightoflifeclub.com/api
VITE_SUPABASE_PUBLISHABLE_KEY: sb_publishable_...
VITE_SUPABASE_URL: https://kihlqhomsychihwzwzuo.supabase.co
```
✅ Docker Compose reads the correct environment variable.

### 3. Docker Image Build Args
**Test**: Check if build args are being passed during build
```bash
root@ubuntu-s-1vcpu-1gb-sgp1-01:/srv/lol/simulation/staging# docker compose -f docker-compose.staging.yml build --no-cache --progress=plain frontend 2>&1 | grep -E '(VITE_API_BASE_URL|ARG|ENV)'
# No output - build args not printed in logs (expected)
```

### 4. Built Frontend Files
**Test**: Check if old URL exists in built JavaScript files
```bash
root@ubuntu-s-1vcpu-1gb-sgp1-01:/srv/lol/simulation/staging# docker run --rm simulation_frontend:staging sh -c 'grep -r "staging.simulation" /usr/share/nginx/html/ 2>/dev/null | head -5'
# No output - old URL NOT found in image

root@ubuntu-s-1vcpu-1gb-sgp1-01:/srv/lol/simulation/staging# docker run --rm simulation_frontend:staging sh -c 'grep -r "staging-simulation" /usr/share/nginx/html/ 2>/dev/null | head -5'
# No output - new URL also NOT found in image (URLs might be minified/obfuscated)
```

### 5. Nginx Configuration (Host-level)
**Location**: `/etc/nginx/sites-available/simulation`

```nginx
# Staging Server Block
server {
    listen 8080;
    server_name staging-simulation.lightoflifeclub.com;  # ✅ Correct subdomain

    client_max_body_size 10M;

    location / {
        proxy_pass http://staging_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # ... (other headers)
    }
}
```
✅ Nginx configured with correct subdomain.

### 6. Cloudflare Tunnel Configuration
**Location**: `/etc/cloudflared/config.yml` AND `~/.cloudflared/config.yml`

**Initial State** (INCORRECT):
```yaml
ingress:
  - hostname: staging.simulation.lightoflifeclub.com  # ❌ Old 3-level subdomain
    service: http://localhost:8080
```

**Fixed State** (CORRECTED):
```yaml
ingress:
  - hostname: staging-simulation.lightoflifeclub.com  # ✅ Corrected to 2-level subdomain
    service: http://localhost:8080
```

**Action Taken**:
```bash
# Modified both config files
nano /etc/cloudflared/config.yml
nano ~/.cloudflared/config.yml

# Restarted cloudflared service
systemctl restart cloudflared
systemctl status cloudflared  # Active (running)
```
✅ Cloudflare tunnel config corrected and service restarted.

### 7. GitHub Actions Environment Variables
**Repository**: https://github.com/SkyDominator/simulation  
**Environment**: staging

**Variables Updated**:
- `VITE_API_BASE_URL`: Changed from `https://staging.simulation.lightoflifeclub.com/api` → `https://staging-simulation.lightoflifeclub.com/api`

**Secrets** (unchanged):
- `SUPABASE_SECRET_KEY`
- `SOLAPI_API_SECRET`
- `SOLAPI_SENDER_NUMBER`
- `OTP_SECRET_KEY`

✅ GitHub environment variables updated.

### 8. Redeployment Attempt
**Method**: Pushed dummy comment to main branch to trigger GitHub Actions workflow

**Result**: Staging rebuilt and redeployed, but issue persists.

---

## Source Code Analysis

### Frontend API Configuration

**File**: `src/frontend/vite.config.ts`
```typescript
// Helper to read env at build time for API base url pattern
const API_BASE =
  process.env.VITE_API_BASE_URL || "https://simulation.lightoflifeclub.com/api";
  // Fallback is PRODUCTION URL (not staging)
```
⚠️ **Fallback value is production URL**, but build should use `VITE_API_BASE_URL` from environment.

**File**: `src/frontend/src/services/ApiService.ts`
```typescript
// Default instance using environment URL
export const API_BASE_URL: string =
  (import.meta as ImportMeta).env.VITE_API_BASE_URL ||
  "https://simulation.lightoflifeclub.com/api";  // Fallback to production
```
⚠️ **Same fallback pattern** - relies on `import.meta.env.VITE_API_BASE_URL` being set at build time.

### Dockerfile Build Process

**File**: `src/frontend/Dockerfile`
```dockerfile
# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY ./src/frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY ./src/frontend .

# Build arguments for environment variables
ARG VITE_API_BASE_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

# Set environment variables for build
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}

# Build application
RUN npm run build
```
✅ Dockerfile correctly accepts build args and sets them as ENV vars.

### Docker Compose Build Configuration

**File**: `docker-compose.staging.yml`
```yaml
frontend:
  build:
    context: .
    dockerfile: src/frontend/Dockerfile
    args:
      - VITE_API_BASE_URL=${VITE_API_BASE_URL}
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
      - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
```
✅ Build args are correctly passed from .env to Dockerfile.

---

## Current Hypothesis

### The Problem
The frontend JavaScript bundle being served to the browser contains the old URL `staging.simulation.lightoflifeclub.com` hardcoded, even though:
- Environment variables are correct
- Docker build args are configured correctly
- Containers have been rebuilt with `--no-cache`

### Possible Causes

1. **Browser Cache**: 
   - The browser may be serving an old version of the JavaScript bundle from cache
   - The bundle filename might not have changed, so browser thinks it's the same file

2. **Service Worker Cache**:
   - PWA service worker (`vite-plugin-pwa`) might be caching the old bundle
   - Service worker needs to be explicitly unregistered and re-registered

3. **Build Environment Issue**:
   - The `npm run build` during Docker build might not be picking up the environment variables
   - Vite might be caching build artifacts somewhere

4. **CDN/Proxy Cache**:
   - Cloudflare might be caching the frontend assets
   - Even though tunnel config is fixed, cached responses might still be served

---

## Actions Taken (Summary)

1. ✅ Updated GitHub Actions environment variables (staging)
2. ✅ Fixed `.env` file on droplet (`/srv/lol/simulation/staging/.env`)
3. ✅ Fixed Cloudflare tunnel config (`/etc/cloudflared/config.yml` and `~/.cloudflared/config.yml`)
4. ✅ Restarted cloudflared service
5. ✅ Triggered redeployment via GitHub Actions (push to main branch)
6. ✅ Verified Docker Compose config reads correct environment variables
7. ✅ Verified Nginx config has correct subdomain
8. ✅ Verified backend is healthy and responding

---

## Next Steps to Try

### Option 1: Force Clear All Caches
```bash
# SSH into droplet
ssh root@157.245.149.182

cd /srv/lol/simulation/staging

# Stop containers
docker compose -f docker-compose.staging.yml down

# Remove images (force rebuild from scratch)
docker rmi simulation_frontend:staging simulation_backend:staging

# Verify .env file one more time
cat .env | grep VITE_API_BASE_URL

# Rebuild with explicit build args (bypass .env potential issues)
docker compose -f docker-compose.staging.yml build --no-cache \
  --build-arg VITE_API_BASE_URL=https://staging-simulation.lightoflifeclub.com/api \
  --build-arg VITE_SUPABASE_URL=https://kihlqhomsychihwzwzuo.supabase.co \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY=<actual-key> \
  frontend

# Start containers
docker compose -f docker-compose.staging.yml up -d

# Verify build
docker run --rm simulation_frontend:staging sh -c 'cat /usr/share/nginx/html/index.html | grep -o "index-[^\"]*\.js"'
# Note the JavaScript bundle filename
```

### Option 2: Clear Browser & Service Worker Cache
**On the client browser**:
1. Open https://staging-simulation.lightoflifeclub.com
2. Open DevTools (F12)
3. Go to **Application** tab → **Service Workers**
4. Click **Unregister** for the service worker
5. Go to **Application** tab → **Storage**
6. Click **Clear site data**
7. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Option 3: Verify JavaScript Bundle Content
```bash
# Extract and examine the actual JavaScript bundle
ssh root@157.245.149.182

cd /srv/lol/simulation/staging

# Get the JavaScript filename
docker run --rm simulation_frontend:staging sh -c 'ls -la /usr/share/nginx/html/assets/*.js'

# Search for any occurrence of "simulation" domain in the bundle
docker run --rm simulation_frontend:staging sh -c 'cat /usr/share/nginx/html/assets/index-*.js | grep -o "https://[^\"]*simulation[^\"]*" | sort | uniq'
```

### Option 4: Check Cloudflare Dashboard DNS
1. Go to Cloudflare Dashboard → DNS → Records
2. Verify DNS records:
   - ✅ `staging-simulation.lightoflifeclub.com` CNAME → `<tunnel-id>.cfargotunnel.com`
   - ❌ `staging.simulation.lightoflifeclub.com` should NOT exist (delete if present)

### Option 5: Purge Cloudflare Cache
1. Cloudflare Dashboard → Caching → Configuration
2. Click **Purge Everything**
3. Wait 30 seconds
4. Test again

### Option 6: Add Debugging to Frontend
Temporarily add console logging to see what URL is being used:

**File**: `src/frontend/src/services/ApiService.ts`
```typescript
export const API_BASE_URL: string =
  (import.meta as ImportMeta).env.VITE_API_BASE_URL ||
  "https://simulation.lightoflifeclub.com/api";

// Add this temporary debug line
console.log('[DEBUG] API_BASE_URL:', API_BASE_URL);
console.log('[DEBUG] import.meta.env:', (import.meta as ImportMeta).env);
```

Push to main, redeploy, and check browser console.

---

## Files to Update in Repository

The following documentation files still reference the old subdomain and should be updated:

### `docs/cicd/ci-cd.md`
Lines to update:
- Line 1422: `BASE_URL: https://staging.simulation.lightoflifeclub.com` → `https://staging-simulation.lightoflifeclub.com`
- Line 1786: Same change in E2E tests section
- Line 3095: `VITE_API_BASE_URL` example

### `.github/workflows/ci-cd.yml`
Check if any hardcoded staging URLs exist in the workflow file.

---

## Key Learnings

1. **Cloudflare Universal SSL Limitation**: Multi-level subdomains (`staging.simulation.lightoflifeclub.com`) are not covered by free Universal SSL certificates.

2. **Docker Build-Time Environment Variables**: Vite environment variables must be available at **build time** (not just runtime) because they are baked into the JavaScript bundle.

3. **Cache Invalidation**: When changing API endpoints, multiple layers of caching must be cleared:
   - Docker build cache
   - Browser cache
   - Service Worker cache
   - CDN/Proxy cache

4. **Debugging Strategy**: Systematic verification of each layer:
   - Container health → Network routing → DNS → CDN → Browser cache

---

## Open Questions

1. **Why is the old URL still appearing in the browser?**
   - We've verified all server-side configs are correct
   - Docker image should have been rebuilt with correct environment variables
   - Likely browser/service worker cache issue

2. **Does the JavaScript bundle actually contain the correct URL?**
   - We couldn't find either URL in grep searches (minification/obfuscation)
   - Need to examine the actual bundle content or add debug logging

3. **Is there a Cloudflare cache layer we're missing?**
   - Tunnel config is correct
   - But Cloudflare might cache at multiple levels

---

## Status: ⏸️ PAUSED - AWAITING NEXT ACTION

**Last Update**: October 13, 2025 07:30 UTC  
**Current State**: Staging deployed, backend healthy, frontend serving pages but using wrong API URL in browser  
**Blocker**: Frontend JavaScript bundle appears to contain old subdomain despite all config changes

**Recommended Next Action**: Option 1 (Force rebuild with explicit build args) + Option 2 (Clear browser cache)
