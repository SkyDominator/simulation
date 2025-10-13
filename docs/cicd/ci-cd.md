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

### 5.2 Configure GitHub Secrets and Variables

**Repository → Settings → Secrets and variables → Actions**

**Secrets** (encrypted, sensitive data):

| Name | Value | Notes |
|------|-------|-------|
| `SUPABASE_SECRET_KEY` | `eyJ...` | Service role (server-side only) |
| `SOLAPI_API_SECRET` | `...` | SMS provider secret |
| `SOLAPI_SENDER_NUMBER` | `01012345678` | Verified sender |
| `OTP_SECRET_KEY` | `...` | 32-char random string |

**Variables** (plain text, non-sensitive configuration):

| Name | Value | Notes |
|------|-------|-------|
| `VITE_API_BASE_URL` | `https://simulation.lightoflifeclub.com/api` | Frontend API endpoint (⚠️ same for both prod/staging in current workflow) |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Public Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJ...` | Anon/public key |
| `SUPABASE_URL` | `https://xxx.supabase.co` | Backend Supabase URL |
| `SUPABASE_PUBLISHABLE_KEY` | `eyJ...` | Backend public key |
| `SOLAPI_API_KEY` | `...` | SMS provider API key |

**Note**: The current workflow uses the same `VITE_API_BASE_URL` for both environments. For proper separation, you would need separate variables (`VITE_API_BASE_URL_PROD` and `VITE_API_BASE_URL_STAGING`) and conditional logic in the workflow.

### 5.3 Docker Compose Files

Create in repository root:

**`docker-compose.production.yml`**:

```yaml
version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: src/backend/Dockerfile
    image: simulation_backend:production
    container_name: simulation_backend_production
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - ENV=production
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SECRET_KEY=${SUPABASE_SECRET_KEY}
      - SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY}
      - SOLAPI_API_KEY=${SOLAPI_API_KEY}
      - SOLAPI_API_SECRET=${SOLAPI_API_SECRET}
      - SOLAPI_SENDER_NUMBER=${SOLAPI_SENDER_NUMBER}
      - OTP_SECRET_KEY=${OTP_SECRET_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    mem_limit: 512m
    memswap_limit: 768m
    networks:
      - production-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: .
      dockerfile: src/frontend/Dockerfile
      args:
        - VITE_API_BASE_URL=${VITE_API_BASE_URL}
        - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
        - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
    image: simulation_frontend:production
    container_name: simulation_frontend_production
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - production-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

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
      dockerfile: src/backend/Dockerfile
    image: simulation_backend:staging
    container_name: simulation_backend_staging
    restart: unless-stopped
    ports:
      - "8001:8000"
    environment:
      - ENV=staging
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SECRET_KEY=${SUPABASE_SECRET_KEY}
      - SUPABASE_PUBLISHABLE_KEY=${SUPABASE_PUBLISHABLE_KEY}
      - SOLAPI_API_KEY=${SOLAPI_API_KEY}
      - SOLAPI_API_SECRET=${SOLAPI_API_SECRET}
      - SOLAPI_SENDER_NUMBER=${SOLAPI_SENDER_NUMBER}
      - OTP_SECRET_KEY=${OTP_SECRET_KEY}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    mem_limit: 512m
    memswap_limit: 768m
    networks:
      - staging-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  frontend:
    build:
      context: .
      dockerfile: src/frontend/Dockerfile
      args:
        - VITE_API_BASE_URL=${VITE_API_BASE_URL}
        - VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
        - VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
    image: simulation_frontend:staging
    container_name: simulation_frontend_staging
    restart: unless-stopped
    ports:
      - "4173:80"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - staging-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

networks:
  staging-network:
    driver: bridge
```

### 5.4 GitHub Actions Workflow

The actual workflow file is `.github/workflows/ci-cd.yml` (not `deploy.yml`).

**Key features**:
- **Hybrid runner strategy**: Tests run on GitHub-hosted runners, deployment on self-hosted
- **Deployment profiles**: Control which test suites run via `.github/deployment-profiles.yml`
- **Environment-based deployment**: `main` branch → staging, `release` branch → production
- **Health checks**: Validates services after deployment
- **.env file generation**: Creates environment files from GitHub secrets/variables

**Simplified workflow structure**:

```yaml
name: CI/CD Pipeline (Production & Staging)

on:
  push:
    branches:
      - release   # Production trigger
      - main      # Staging trigger
  workflow_dispatch:
    inputs:
      environment:
        description: "Deploy environment (production / staging)"
        type: choice
        options:
          - production
          - staging

jobs:
  load-profile:
    # Loads test configuration from deployment-profiles.yml
    
  test-unit:
    # Runs frontend & backend unit tests on GitHub-hosted runners
    
  test-integration:
    # Runs backend integration tests on GitHub-hosted runners
    
  test-security:
    # Runs security tests on GitHub-hosted runners
    
  lint:
    # Runs linting and type checking
    
  build:
    # Determines deployment target (production/staging)
    
  deploy-production:
    # Deploys to production on self-hosted runner
    runs-on: [self-hosted, linux, droplet]
    steps:
      - name: Create .env file
        # Generates .env from GitHub secrets/variables
      - name: Build and Deploy
        # Builds and starts containers with docker compose
      - name: Health Check
        # Validates deployment on port 3000
        
  deploy-staging:
    # Deploys to staging on self-hosted runner
    runs-on: [self-hosted, linux, droplet]
    steps:
      - name: Create .env file
        # Generates .env from GitHub secrets/variables
      - name: Build and Deploy
        # Builds and starts containers with docker compose
      - name: Health Check
        # Validates deployment on port 4173
        
  test-e2e:
    # Optional E2E tests after staging deployment
```

**Important notes**:
- The workflow creates `.env` files dynamically in deployment directories
- Uses `vars.*` for public configuration and `secrets.*` for sensitive data
- Health checks validate services on correct ports (3000 for prod, 4173 for staging)
- Full workflow definition is in `.github/workflows/ci-cd.yml` (459 lines)

### 5.5 Test Control via Deployment Profiles

The file `.github/deployment-profiles.yml` already exists and controls which tests run for each environment.

**Current Configuration**:

```yaml
# Production Environment (release branch)
production:
  profile: unit-integration  # Skips E2E tests
  
# Staging Environment (main branch)
staging:
  profile: unit-integration  # Skips E2E tests

# Available Profiles:
profiles:
  full-test:
    description: "Run all tests (Unit + Integration + E2E)"
    skip_tests: ""
    estimated_time: "20-30 minutes"
  
  unit-integration:
    description: "Run Unit and Integration tests only (skip E2E)"
    skip_tests: "e2e"
    estimated_time: "10-15 minutes"
  
  unit-only:
    description: "Run Unit tests only"
    skip_tests: "integration,e2e"
    estimated_time: "5-7 minutes"
  
  e2e-only:
    description: "Run E2E tests only (skip Unit and Integration)"
    skip_tests: "unit,integration"
    estimated_time: "10-20 minutes"
  
  no-test:
    description: "Skip all tests (build and deploy only)"
    skip_tests: "unit,integration,e2e"
    estimated_time: "3-5 minutes"
```

**To Change Test Configuration**:

1. Edit `.github/deployment-profiles.yml`
2. Change `production.profile` or `staging.profile` to desired profile name
3. Push changes to trigger new configuration

**Manual Workflow Dispatch**:
- Go to Actions → CI/CD Pipeline → Run workflow
- Select environment and optionally specify custom `skip_tests` (e.g., "e2e")

---

## 6. Migration & Verification

### 6.1 Deploy and Validate Staging

**Step 1: Push to main branch**

```bash
# Triggers staging deployment automatically
git checkout main
git push origin main
```

**Step 2: Monitor GitHub Actions**

1. Go to GitHub repo → Actions tab
2. Watch the "CI/CD Pipeline (Production & Staging)" workflow
3. Verify all jobs complete successfully (tests → build → deploy-staging)

**Step 3: Verify Staging Deployment**

```bash
# 1. SSH into Droplet
ssh deploy@<DROPLET_IP>

# 2. Check containers
docker ps
# Should show: simulation_backend_staging, simulation_frontend_staging

# 3. Check logs
docker logs simulation_frontend_staging
docker logs simulation_backend_staging

# 4. Test health endpoint
curl -f http://localhost:4173/health
# Should return 200 OK

# 5. Test public domain
curl -I https://staging-simulation.lightoflifeclub.com
# Should return 200 OK with proper headers
```

**Step 4: Full Browser Testing**

Open `https://staging-simulation.lightoflifeclub.com` and test:

- [ ] Login (Google, Kakao OAuth)
- [ ] Create new simulation
- [ ] View simulation results
- [ ] Edit simulation
- [ ] Delete simulation
- [ ] View notices
- [ ] Check mobile responsiveness
- [ ] Test all major user flows

**STOP HERE if any issues found. Debug before proceeding to production.**

### 6.2 Deploy to Production (After Staging Success)

**Prerequisites**:
- ✅ Staging deployed successfully
- ✅ All browser tests passed
- ✅ No critical issues found

**Step 1: Create/Update Release Branch**

```bash
# Option A: Create release branch from main (first time)
git checkout -b release
git push origin release

# Option B: Update existing release branch
git checkout release
git merge main
git push origin release
```

**Step 2: Monitor Production Deployment**

1. GitHub Actions automatically triggers production deployment
2. Watch workflow: Tests → Build → Deploy-production
3. Verify health check passes (port 3000)

**Step 3: Verify Production on Droplet**

```bash
# SSH into Droplet
ssh deploy@<DROPLET_IP>

# Check production containers
docker ps
# Should show: simulation_backend_production, simulation_frontend_production

# Test local health endpoint
curl -f http://localhost:3000/health
# Should return 200 OK
```

**Step 4: Update DNS (Switchover from Windows)**

**ONLY proceed if production containers are healthy!**

1. Login to Cloudflare Dashboard
2. Select domain `lightoflifeclub.com`
3. Go to DNS → Records
4. Find `simulation` CNAME record (currently pointing to Windows tunnel)
5. Edit: Change target from `<OLD_TUNNEL_ID>.cfargotunnel.com` to `<DROPLET_TUNNEL_ID>.cfargotunnel.com`
6. Save (DNS propagation: 1-5 minutes)

**Step 5: Stop Windows Services**

```powershell
# On Windows machine
# Find and stop cloudflared process
Get-Process | Where-Object {$_.ProcessName -like "*cloudflared*"}
Stop-Process -Id <PID>

# Optionally stop backend/frontend services
# (Only after confirming production works)
```

**Step 6: Verify Production Access**

```bash
# Wait 5 minutes for DNS propagation

# Check DNS resolution
nslookup simulation.lightoflifeclub.com
# Should show Cloudflare CNAME

# Test public endpoint
curl -I https://simulation.lightoflifeclub.com
# Should return 200 OK

# Browser test
# Open https://simulation.lightoflifeclub.com
# Perform full user flow testing
```

**Congratulations! Production migration complete.**

### 6.3 Rollback Procedure

**If production deployment fails or issues are discovered**:

```bash
# 1. Revert DNS in Cloudflare
# - Dashboard → DNS → Records → simulation
# - Change CNAME target back to <OLD_TUNNEL_ID>.cfargotunnel.com
# - Save (propagation: 1-5 minutes)

# 2. Restart Windows cloudflared (if stopped)
cloudflared tunnel run <OLD_TUNNEL_NAME>

# 3. Verify Windows service restoration
curl https://simulation.lightoflifeclub.com/health

# Total rollback time: ~5-10 minutes
```

**Container-level rollback** (if DNS not yet switched):

```bash
# Rollback to previous image version
cd /srv/lol/simulation/production
docker compose -f docker-compose.production.yml down
# Manually pull previous image tags or restore from backup
docker compose -f docker-compose.production.yml up -d
```

**Note**: Staging environment remains unaffected during production rollback.

---

## 7. Operations

### 7.1 Daily Operations

**View logs**:

```bash
# Staging
docker logs -f simulation_frontend_staging
docker logs -f simulation_backend_staging

# Production
docker logs -f simulation_frontend_production
docker logs -f simulation_backend_production
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

### GitHub Secrets (Encrypted, Sensitive)

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_SECRET_KEY` | Service role key (server-side only) | `eyJ...` |
| `SOLAPI_API_SECRET` | SMS provider secret | `...` |
| `SOLAPI_SENDER_NUMBER` | Verified sender phone | `01012345678` |
| `OTP_SECRET_KEY` | OTP encryption key | `random-32-char-string` |

### GitHub Variables (Plain Text, Non-Sensitive)

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Frontend API endpoint (⚠️ shared by both environments) | `https://simulation.lightoflifeclub.com/api` |
| `VITE_SUPABASE_URL` | Public Supabase URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/public key | `eyJ...` |
| `SUPABASE_URL` | Backend Supabase URL | `https://xxx.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Backend public key | `eyJ...` |
| `SOLAPI_API_KEY` | SMS provider API key | `...` |

### Docker Compose Environment Variables

**Backend** (runtime, passed via `.env` file):

- `ENV`: `production` or `staging`
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SUPABASE_PUBLISHABLE_KEY`
- `SOLAPI_API_KEY`
- `SOLAPI_API_SECRET`
- `SOLAPI_SENDER_NUMBER`
- `OTP_SECRET_KEY`

**Frontend** (build-time arguments from `.env` file):

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**How it works**:

1. GitHub Actions creates `.env` file in `/srv/lol/simulation/{production|staging}/.env`
2. Backend containers read environment variables at runtime
3. Frontend Dockerfile reads `.env` as build arguments during `docker compose build`
4. Frontend build-time variables are embedded in the built static files

**Current Limitation**: Both environments use the same `VITE_API_BASE_URL` variable. For true separation, staging should use `https://staging-simulation.lightoflifeclub.com/api`, but the workflow would need to be modified to set this conditionally.

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
