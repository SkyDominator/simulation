# CI/CD Configuration Guide

Complete guide for deploying the simulation application from Windows development environment to DigitalOcean Droplet with automated CI/CD.

## Quick Overview

**Migration Path**: Windows 11 laptop → DigitalOcean Droplet (1 CPU, 1GB RAM)

**Environments**:
- **Production**: `simulation.lightoflifeclub.com` (release branch)
- **Staging**: `staging-simulation.lightoflifeclub.com` (main branch)

**Stack**: GitHub Actions + Docker + Nginx + Cloudflare Tunnel

**Expected Duration**: 3-4 hours (setup 2h + validation 1h + DNS switch 30min)

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Prerequisites](#2-prerequisites)
3. [Server Setup](#3-server-setup)
4. [Networking Configuration](#4-networking-configuration)
5. [CI/CD Pipeline](#5-cicd-pipeline)
6. [Migration & Verification](#6-migration--verification)
7. [Operations](#7-operations)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Architecture

### System Overview

```
GitHub (main/release) 
    → GitHub Actions (tests on GitHub-hosted, build/deploy on self-hosted)
        → Droplet (Docker Compose: Production + Staging)
            → Nginx (host-based routing)
                → Cloudflare Tunnel 
                    → Users
```

### Key Components

| Component | Purpose | Details |
|-----------|---------|---------|
| GitHub Actions | CI/CD automation | Hybrid runner strategy |
| Self-hosted Runner | Build & deploy | Runs on Droplet |
| Docker Compose | Container orchestration | Separate prod/staging |
| Nginx | Reverse proxy | Host-based routing on port 8080 |
| Cloudflare Tunnel | Secure ingress | Single tunnel for both environments |

### Port Mapping

| Environment | Frontend | Backend | Domain |
|-------------|----------|---------|--------|
| Production | 3000 | 8000 | `simulation.lightoflifeclub.com` |
| Staging | 4173 | 8001 | `staging-simulation.lightoflifeclub.com` |
| Nginx | 8080 | - | Both domains |

**Why `staging-simulation` not `staging.simulation`?**  
Cloudflare Universal SSL doesn't support multi-level subdomains (3+ levels). Using `staging-simulation` (2 levels) ensures automatic SSL coverage.

### Hybrid Runner Strategy

**GitHub-hosted runners** (tests only):
- ✅ Free GitHub Actions minutes
- ✅ Clean environment per run
- ✅ Parallel execution
- ✅ Pre-installed tools (Node.js, Python, Playwright)

**Self-hosted runner** (build/deploy only):
- ✅ Direct deployment on same machine
- ✅ No image registry needed
- ✅ Direct file system access
- ❌ 1GB RAM insufficient for tests + services

---

## 2. Prerequisites

### Accounts Required

- [x] DigitalOcean account (for Droplet)
- [x] Cloudflare account (existing - for tunnel/DNS)
- [x] GitHub account (existing - for repo/Actions)
- [x] Supabase account (existing - for DB/auth)
- [x] Solapi account (existing - for SMS OTP)

### Information to Collect

**From Windows Environment** (already in use):

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SECRET_KEY=eyJ... # Server-side only

# Solapi (SMS)
SOLAPI_API_KEY=...
SOLAPI_API_SECRET=...
SOLAPI_SENDER_NUMBER=01012345678

# OTP
OTP_SECRET_KEY=... # Use existing to maintain OTP compatibility
```

### Backup Windows Environment

**IMPORTANT**: Do this BEFORE starting migration!

```powershell
# PowerShell on Windows

# 1. Check running processes
Get-Process | Where-Object {$_.ProcessName -like "*python*" -or $_.ProcessName -like "*node*"}

# 2. Backup Cloudflare Tunnel config
cloudflared tunnel list > tunnel-backup.txt
Copy-Item "$env:USERPROFILE\.cloudflared\config.yml" -Destination ".\cloudflared-config-backup.yml"

# 3. Backup environment variables
Get-Content ".\src\backend\.env" > backend-env-backup.txt
Get-Content ".\src\frontend\.env.local" > frontend-env-backup.txt
```

**Keep Windows environment running until Droplet is fully verified!**

---

## 3. Server Setup

### 3.1 Create Droplet

**DigitalOcean Settings**:
- Image: Ubuntu 22.04 LTS (x64)
- Plan: Basic - 1 vCPU, 1GB RAM, 25GB SSD (~$6/month)
- Datacenter: Singapore or nearest region
- Authentication: SSH keys (recommended)
- Hostname: `simulation-prod-staging`

Note the Public IP address (e.g., `157.245.xxx.xxx`)

### 3.2 Initial Server Configuration

```bash
# SSH into Droplet
ssh root@<DROPLET_IP>

# Update system
apt update && apt upgrade -y

# Install essentials
apt install -y curl wget git build-essential software-properties-common \
  apt-transport-https ca-certificates gnupg lsb-release ufw

# Set timezone
timedatectl set-timezone Asia/Seoul

# Create deploy user
adduser deploy
usermod -aG sudo deploy
groupadd docker
usermod -aG docker deploy

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 8080/tcp  # Nginx (Cloudflare Tunnel only)
ufw enable

# Add swap (essential for 1GB RAM)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# Verify
free -h
```

### 3.3 Install Docker

```bash
# Add Docker repository
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Install Docker Compose V2 (plugin)
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Enable and start
systemctl start docker
systemctl enable docker

# Verify
docker --version
docker compose version
```

### 3.4 Create Deployment Directories

```bash
# Create directory structure
mkdir -p /srv/lol/simulation/production
mkdir -p /srv/lol/simulation/staging
chown -R deploy:deploy /srv/lol/simulation
```

---

## 4. Networking Configuration

### 4.1 Install Nginx

```bash
# Install
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# Remove default site
rm /etc/nginx/sites-enabled/default
```

### 4.2 Configure Nginx

Create `/etc/nginx/sites-available/simulation`:

```nginx
# Upstream definitions
upstream production_frontend {
    server localhost:3000;
}

upstream staging_frontend {
    server localhost:4173;
}

# Production
server {
    listen 8080;
    server_name simulation.lightoflifeclub.com;
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://production_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://production_frontend/health;
        access_log off;
    }
}

# Staging
server {
    listen 8080;
    server_name staging-simulation.lightoflifeclub.com;
    client_max_body_size 10M;
    
    location / {
        proxy_pass http://staging_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    location /health {
        proxy_pass http://staging_frontend/health;
        access_log off;
    }
}
```

Enable and verify:

```bash
ln -s /etc/nginx/sites-available/simulation /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 4.3 Setup Cloudflare Tunnel

```bash
# Install cloudflared (check latest version at github.com/cloudflare/cloudflared/releases)
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# Authenticate (open URL in browser)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create simulation-tunnel
# Note the TUNNEL_ID from output

# Create DNS record for STAGING ONLY (Production stays on Windows for now)
cloudflared tunnel route dns simulation-tunnel staging-simulation.lightoflifeclub.com

# Configure tunnel
cat > /etc/cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: simulation.lightoflifeclub.com
    service: http://localhost:8080
  - hostname: staging-simulation.lightoflifeclub.com
    service: http://localhost:8080
  - service: http_status:404
EOF

# Replace <TUNNEL_ID> with actual ID

# Install as system service
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared

# Verify
systemctl status cloudflared
journalctl -u cloudflared -f
```

**DNS Strategy**:
- ✅ Create `staging-simulation.lightoflifeclub.com` → Droplet tunnel (NOW)
- ❌ Keep `simulation.lightoflifeclub.com` → Windows tunnel (until validation complete)

---

## 5. CI/CD Pipeline

### 5.1 Setup GitHub Self-Hosted Runner

```bash
# Switch to deploy user
su - deploy

# Download runner (check latest at github.com/actions/runner/releases)
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64-2.328.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.328.0.tar.gz

# Configure (get token from: GitHub repo → Settings → Actions → Runners → New self-hosted runner)
./config.sh --url https://github.com/SkyDominator/simulation --token <GITHUB_RUNNER_TOKEN>
# Name: droplet-runner
# Labels: linux,droplet

# Exit deploy user
exit

# Install as service (as root)
cd /home/deploy/actions-runner
./svc.sh install deploy
./svc.sh start

# Verify in GitHub: Settings → Actions → Runners (should show "Idle")
```

### 5.2 Configure GitHub Secrets

**Repository → Settings → Secrets and variables → Actions**

**Secrets** (encrypted):

| Name | Value | Notes |
|------|-------|-------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | From Windows backup |
| `SUPABASE_PUBLISHABLE_KEY` | `eyJ...` | Anon/public key |
| `SUPABASE_SECRET_KEY` | `eyJ...` | Service role (server-side only) |
| `SOLAPI_API_KEY` | `...` | SMS provider |
| `SOLAPI_API_SECRET` | `...` | SMS provider |
| `SOLAPI_SENDER_NUMBER` | `01012345678` | Verified sender |
| `OTP_SECRET_KEY` | `...` | 32-char random string |

**Variables** (plain text):

| Name | Value | Notes |
|------|-------|-------|
| `OTP_VALIDITY_MINUTES` | `5` | Default |
| `OTP_RESEND_LIMIT_PER_15MIN` | `3` | Rate limit |
| `OTP_RESEND_LIMIT_PER_DAY` | `10` | Rate limit |
| `otp_max_verification_attempts` | `6` | Lowercase! |

### 5.3 Docker Compose Files

Create in repository root:

**`docker-compose.production.yml`**:

```yaml
version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: ./src/backend/Dockerfile
    container_name: prod-backend
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_PUBLISHABLE_KEY: ${SUPABASE_PUBLISHABLE_KEY}
      SUPABASE_SECRET_KEY: ${SUPABASE_SECRET_KEY}
      SOLAPI_API_KEY: ${SOLAPI_API_KEY}
      SOLAPI_API_SECRET: ${SOLAPI_API_SECRET}
      SOLAPI_SENDER_NUMBER: ${SOLAPI_SENDER_NUMBER}
      OTP_SECRET_KEY: ${OTP_SECRET_KEY}
      OTP_VALIDITY_MINUTES: ${OTP_VALIDITY_MINUTES:-5}
      OTP_RESEND_LIMIT_PER_15MIN: ${OTP_RESEND_LIMIT_PER_15MIN:-3}
      OTP_RESEND_LIMIT_PER_DAY: ${OTP_RESEND_LIMIT_PER_DAY:-10}
      otp_max_verification_attempts: ${otp_max_verification_attempts:-6}
    ports:
      - "8000:8000"
    networks:
      - production-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: .
      dockerfile: ./src/frontend/Dockerfile
      args:
        VITE_SUPABASE_URL: ${SUPABASE_URL}
        VITE_SUPABASE_PUBLISHABLE_KEY: ${SUPABASE_PUBLISHABLE_KEY}
        VITE_API_BASE_URL: https://simulation.lightoflifeclub.com/api
    container_name: prod-frontend
    ports:
      - "3000:80"
    networks:
      - production-network
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  production-network:
    driver: bridge
```

**`docker-compose.staging.yml`**:

```yaml
version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: ./src/backend/Dockerfile
    container_name: staging-backend
    environment:
      SUPABASE_URL: ${SUPABASE_URL}
      SUPABASE_PUBLISHABLE_KEY: ${SUPABASE_PUBLISHABLE_KEY}
      SUPABASE_SECRET_KEY: ${SUPABASE_SECRET_KEY}
      SOLAPI_API_KEY: ${SOLAPI_API_KEY}
      SOLAPI_API_SECRET: ${SOLAPI_API_SECRET}
      SOLAPI_SENDER_NUMBER: ${SOLAPI_SENDER_NUMBER}
      OTP_SECRET_KEY: ${OTP_SECRET_KEY}
      OTP_VALIDITY_MINUTES: ${OTP_VALIDITY_MINUTES:-5}
      OTP_RESEND_LIMIT_PER_15MIN: ${OTP_RESEND_LIMIT_PER_15MIN:-3}
      OTP_RESEND_LIMIT_PER_DAY: ${OTP_RESEND_LIMIT_PER_DAY:-10}
      otp_max_verification_attempts: ${otp_max_verification_attempts:-6}
    ports:
      - "8001:8000"
    networks:
      - staging-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    build:
      context: .
      dockerfile: ./src/frontend/Dockerfile
      args:
        VITE_SUPABASE_URL: ${SUPABASE_URL}
        VITE_SUPABASE_PUBLISHABLE_KEY: ${SUPABASE_PUBLISHABLE_KEY}
        VITE_API_BASE_URL: https://staging-simulation.lightoflifeclub.com/api
    container_name: staging-frontend
    ports:
      - "4173:80"
    networks:
      - staging-network
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  staging-network:
    driver: bridge
```

### 5.4 GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production and Staging

on:
  push:
    branches:
      - main      # Triggers Staging deployment
      - release   # Triggers Production deployment

env:
  SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
  SUPABASE_PUBLISHABLE_KEY: ${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
  SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}
  SOLAPI_API_KEY: ${{ secrets.SOLAPI_API_KEY }}
  SOLAPI_API_SECRET: ${{ secrets.SOLAPI_API_SECRET }}
  SOLAPI_SENDER_NUMBER: ${{ secrets.SOLAPI_SENDER_NUMBER }}
  OTP_SECRET_KEY: ${{ secrets.OTP_SECRET_KEY }}
  OTP_VALIDITY_MINUTES: ${{ vars.OTP_VALIDITY_MINUTES }}
  OTP_RESEND_LIMIT_PER_15MIN: ${{ vars.OTP_RESEND_LIMIT_PER_15MIN }}
  OTP_RESEND_LIMIT_PER_DAY: ${{ vars.OTP_RESEND_LIMIT_PER_DAY }}
  otp_max_verification_attempts: ${{ vars.otp_max_verification_attempts }}

jobs:
  # Tests run on GitHub-hosted runners
  test-backend:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        working-directory: src/backend
        run: |
          pip install -r requirements.txt
      
      - name: Run tests
        working-directory: src/backend
        run: |
          python -m pytest tests/ -v --tb=short

  test-frontend:
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        working-directory: src/frontend
        run: npm ci
      
      - name: Run unit tests
        working-directory: src/frontend
        run: npm run test:unit

  # Deploy to Staging (main branch)
  deploy-staging:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: [self-hosted, linux, droplet]
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy source code
        run: |
          rsync -av --delete \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude '__pycache__' \
            --exclude '.pytest_cache' \
            --exclude 'coverage' \
            $GITHUB_WORKSPACE/ /srv/lol/simulation/staging/
      
      - name: Build and deploy containers
        working-directory: /srv/lol/simulation/staging
        run: |
          docker compose -f docker-compose.staging.yml down || true
          docker compose -f docker-compose.staging.yml up -d --build
          docker compose -f docker-compose.staging.yml ps

  # Deploy to Production (release branch)
  deploy-production:
    needs: [test-backend, test-frontend]
    if: github.ref == 'refs/heads/release'
    runs-on: [self-hosted, linux, droplet]
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy source code
        run: |
          rsync -av --delete \
            --exclude 'node_modules' \
            --exclude '.git' \
            --exclude '__pycache__' \
            --exclude '.pytest_cache' \
            --exclude 'coverage' \
            $GITHUB_WORKSPACE/ /srv/lol/simulation/production/
      
      - name: Build and deploy containers
        working-directory: /srv/lol/simulation/production
        run: |
          docker compose -f docker-compose.production.yml down || true
          docker compose -f docker-compose.production.yml up -d --build
          docker compose -f docker-compose.production.yml ps
```

### 5.5 Test Control (Optional)

Create `.github/deployment-profiles.yml` to control which tests run:

```yaml
profiles:
  full:
    backend:
      unit: true
      integration: true
      security: true
    frontend:
      unit: true
      component: true
      integration: true
      security: true
      e2e: true

  fast:
    backend:
      unit: true
      integration: false
      security: false
    frontend:
      unit: true
      component: false
      integration: false
      security: false
      e2e: false

  pr:
    backend:
      unit: true
      integration: true
      security: false
    frontend:
      unit: true
      component: true
      integration: false
      security: false
      e2e: false
```

Trigger with: `[profile:fast]` in commit message

---

## 6. Migration & Verification

### 6.1 Staging Validation

**Push to main branch** → Triggers staging deployment automatically

**Verify Staging**:

```bash
# 1. Check containers on Droplet
ssh deploy@<DROPLET_IP>
docker ps  # Should show staging-frontend, staging-backend

# 2. Check logs
docker logs staging-frontend
docker logs staging-backend

# 3. Test domain
curl -I https://staging-simulation.lightoflifeclub.com
# Should return 200 OK

# 4. Browser testing
# Open https://staging-simulation.lightoflifeclub.com
# Test: Login, create simulation, all features
```

### 6.2 Production DNS Switchover

**ONLY proceed if Staging validation is successful!**

**Step 1: Update Cloudflare DNS**

1. Login to Cloudflare Dashboard
2. Select domain `lightoflifeclub.com`
3. Go to DNS → Records
4. Find `simulation` record (currently pointing to Windows tunnel)
5. Edit: Change target from `<OLD_TUNNEL_ID>.cfargotunnel.com` to `<DROPLET_TUNNEL_ID>.cfargotunnel.com`
6. Save (DNS propagation: 1-5 minutes)

**Step 2: Stop Windows Tunnel**

```powershell
# On Windows machine
# Find cloudflared process
Get-Process | Where-Object {$_.ProcessName -like "*cloudflared*"}

# Stop it (adjust PID)
Stop-Process -Id <PID>
```

**Step 3: Verify Production**

```bash
# Wait 5 minutes for DNS propagation

# Check DNS
nslookup simulation.lightoflifeclub.com
# Should resolve to Cloudflare CNAME

# Test
curl -I https://simulation.lightoflifeclub.com
# Should return 200 OK

# Browser test
# Open https://simulation.lightoflifeclub.com
# Full functionality test
```

**Step 4: Deploy to Production**

```bash
# Create release branch (if not exists)
git checkout -b release
git push origin release

# Or merge main into release
git checkout release
git merge main
git push origin release
```

GitHub Actions will automatically deploy to production.

### 6.3 Rollback Procedure

**If anything goes wrong**:

```bash
# 1. Revert DNS in Cloudflare (change back to Windows tunnel ID)
# 2. Restart Windows cloudflared
cloudflared tunnel run <OLD_TUNNEL_NAME>

# 3. Verify Windows service
curl https://simulation.lightoflifeclub.com

# Time: ~5-10 minutes
```

---

## 7. Operations

### 7.1 Daily Operations

**View logs**:

```bash
# Staging
docker logs -f staging-frontend
docker logs -f staging-backend

# Production
docker logs -f prod-frontend
docker logs -f prod-backend
```

**Restart services**:

```bash
# Staging
cd /srv/lol/simulation/staging
docker compose -f docker-compose.staging.yml restart

# Production
cd /srv/lol/simulation/production
docker compose -f docker-compose.production.yml restart
```

**Check status**:

```bash
docker ps
docker stats

# Nginx
systemctl status nginx
nginx -t

# Cloudflare Tunnel
systemctl status cloudflared
journalctl -u cloudflared -f
```

### 7.2 Zero-Downtime Deployment

The workflow uses `docker compose down` → `up --build`, which causes brief downtime (~10-30 seconds).

**For true zero-downtime** (future improvement):

1. Use `docker compose up -d --no-deps --build <service>` (rolling update)
2. Implement blue-green deployment
3. Add health check polling before traffic switch

### 7.3 Monitoring

**Health endpoints**:
- Production: `https://simulation.lightoflifeclub.com/health`
- Staging: `https://staging-simulation.lightoflifeclub.com/health`

**Cloudflare Tunnel**:
- Dashboard: Zero Trust → Access → Tunnels
- Check status: HEALTHY (green)

---

## 8. Troubleshooting

### Issue: SSL Certificate Error on Staging

**Symptom**: `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` on `staging-simulation.lightoflifeclub.com`

**Cause**: Cloudflare Universal SSL doesn't support 3+ level subdomains

**Solution**: Already implemented - using `staging-simulation` (2 levels) instead of `staging.simulation` (3 levels)

### Issue: Container Failed to Start

```bash
# Check logs
docker logs <container-name>

# Common causes:
# 1. Port already in use
sudo lsof -i :3000  # or :4173, :8000, :8001
# Kill process: sudo kill -9 <PID>

# 2. Environment variables missing
# Check: docker inspect <container-name> | grep -A 20 Env

# 3. Build failure
# Rebuild: docker compose -f docker-compose.<env>.yml build --no-cache
```

### Issue: Nginx 502 Bad Gateway

```bash
# Check if containers are running
docker ps

# Check Nginx config
nginx -t

# Check Nginx logs
tail -f /var/log/nginx/error.log

# Verify ports
netstat -tulpn | grep -E '3000|4173|8080'

# Restart Nginx
systemctl restart nginx
```

### Issue: DNS Not Resolving

```bash
# Check DNS propagation
nslookup simulation.lightoflifeclub.com
dig simulation.lightoflifeclub.com

# Check Cloudflare DNS records
# Dashboard → DNS → Records
# Verify CNAME points to correct tunnel

# Clear local DNS cache
# Windows: ipconfig /flushdns
# Linux: sudo systemd-resolve --flush-caches
```

### Issue: Deployment Stuck

```bash
# Check GitHub Actions
# Repo → Actions → Recent workflow runs

# Check self-hosted runner
systemctl status actions.runner.*
journalctl -u actions.runner.* -f

# Restart runner
cd /home/deploy/actions-runner
sudo ./svc.sh restart

# Check runner connectivity
# GitHub repo → Settings → Actions → Runners
```

### Issue: High Memory Usage (1GB RAM)

```bash
# Check memory
free -h

# Check container memory
docker stats

# If OOM (Out of Memory):
# 1. Restart containers one by one
docker restart staging-backend
docker restart staging-frontend

# 2. Check swap
swapon --show

# 3. Consider stopping one environment temporarily
cd /srv/lol/simulation/staging
docker compose -f docker-compose.staging.yml down
```

---

## Appendix: Environment Variables Reference

### Backend Environment Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `SUPABASE_URL` | Secret | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | Secret | Service role key | `eyJ...` |
| `SUPABASE_PUBLISHABLE_KEY` | Secret | Anon/public key | `eyJ...` |
| `SOLAPI_API_KEY` | Secret | SMS provider key | `...` |
| `SOLAPI_API_SECRET` | Secret | SMS provider secret | `...` |
| `SOLAPI_SENDER_NUMBER` | Secret | Verified sender | `01012345678` |
| `OTP_SECRET_KEY` | Secret | OTP encryption key | `random-32-char-string` |
| `OTP_VALIDITY_MINUTES` | Variable | OTP expiry | `5` |
| `OTP_RESEND_LIMIT_PER_15MIN` | Variable | Rate limit | `3` |
| `OTP_RESEND_LIMIT_PER_DAY` | Variable | Daily limit | `10` |
| `otp_max_verification_attempts` | Variable | Max attempts (lowercase!) | `6` |

### Frontend Build Arguments

| Variable | Description | Production | Staging |
|----------|-------------|------------|---------|
| `VITE_SUPABASE_URL` | Supabase URL | Same as backend | Same as backend |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public key | Same as backend | Same as backend |
| `VITE_API_BASE_URL` | API endpoint | `https://simulation.lightoflifeclub.com/api` | `https://staging-simulation.lightoflifeclub.com/api` |

---

## Quick Reference: Common Commands

```bash
# Check all services
docker ps
systemctl status nginx
systemctl status cloudflared

# View logs
docker logs -f <container-name>
journalctl -u nginx -f
journalctl -u cloudflared -f

# Restart services
docker restart <container-name>
systemctl restart nginx
systemctl restart cloudflared

# Full redeploy
cd /srv/lol/simulation/<production|staging>
docker compose -f docker-compose.<env>.yml down
docker compose -f docker-compose.<env>.yml up -d --build

# Test endpoints
curl -I https://simulation.lightoflifeclub.com/health
curl -I https://staging-simulation.lightoflifeclub.com/health

# Check memory/CPU
free -h
docker stats
htop
```

---

**End of Guide**
