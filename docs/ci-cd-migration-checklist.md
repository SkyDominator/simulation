# CI/CD Migration Checklist

Use this checklist to migrate from your current CI/CD setup to the new, properly separated Production & Staging configuration.

## Phase 1: Preparation (Read First!)

- [ ] Read the warning section in `docs/ci-cd.md` (lines 1-40)
- [ ] Review `docs/ci-cd-review-summary.md`
- [ ] Backup current deployment configuration
- [ ] Note current running containers: `docker ps`

## Phase 2: Create New Files

### Docker Compose Files

- [ ] Create `docker-compose.production.yml` in repo root
  - Port mapping: `3000:80` (frontend), `8000:8000` (backend)
  - Service names: `backend`, `frontend`
  - Network: `production-network`
  - Environment: `ENV=production`

- [ ] Create `docker-compose.staging.yml` in repo root
  - Port mapping: `5173:80` (frontend), `8001:8000` (backend)
  - Service names: `backend`, `frontend`
  - Network: `staging-network`
  - Environment: `ENV=staging`

### Nginx Configuration (Optional - if you need to verify)

- [ ] Verify `config/nginx/frontend.conf` uses `backend:8000`
  - This file is used inside containers
  - Should NOT have environment-specific configs

## Phase 3: Update Droplet

### SSH to Droplet

```bash
ssh root@<YOUR_DROPLET_IP>
```

### Create Separate Directories

```bash
mkdir -p /srv/lol/simulation/production
mkdir -p /srv/lol/simulation/staging
chown -R deploy:deploy /srv/lol/simulation
```

### Update Host Nginx Configuration

```bash
# Edit the nginx config
nano /etc/nginx/sites-available/simulation

# Update upstream ports:
# production_frontend: localhost:3000
# staging_frontend: localhost:5173

# Test configuration
nginx -t

# Reload if successful
systemctl reload nginx
```

## Phase 4: Update GitHub Workflow

- [ ] Backup current `.github/workflows/ci-cd.yml`
  ```bash
  cp .github/workflows/ci-cd.yml .github/workflows/ci-cd.yml.backup
  ```

- [ ] Replace workflow with new version from `docs/ci-cd.md` section 10.1
  - Key changes:
    - `skip_tests` input parameter
    - Separate deployment directories (production/, staging/)
    - Port 3000 health check for Production
    - Port 5173 health check for Staging
    - `rsync` command to copy files

- [ ] Commit and push to a test branch first (DO NOT push to main/release yet)

## Phase 5: Update GitHub Settings

### Secrets (if not already set)

- [ ] Add `OTP_SECRET_KEY` to GitHub Secrets
  ```bash
  # Generate a random 32-character string
  openssl rand -base64 32
  ```

### Variables

Production Environment:
- [ ] `VITE_API_BASE_URL`: `https://simulation.lightoflifeclub.com/api`
- [ ] Other vars per section 9.2 of ci-cd.md

Staging Environment:
- [ ] `VITE_API_BASE_URL`: `https://staging.simulation.lightoflifeclub.com/api`
- [ ] Other vars per section 9.2 of ci-cd.md

## Phase 6: Test Staging Deployment

### Trigger Staging Deploy

- [ ] Merge your test branch to `main` (or use workflow_dispatch)
- [ ] Watch GitHub Actions: Repository → Actions
- [ ] Monitor logs for errors

### Verify Staging

```bash
# SSH to Droplet
ssh deploy@<YOUR_DROPLET_IP>

# Check if staging directory exists
ls -la /srv/lol/simulation/staging/

# Check containers are running
docker ps | grep staging

# Expected output:
# simulation_backend_staging   ...  0.0.0.0:8001->8000/tcp
# simulation_frontend_staging  ...  0.0.0.0:5173->80/tcp

# Test health endpoints
curl http://localhost:5173/health
curl http://localhost:8001/api/health

# Test external domain
curl https://staging.simulation.lightoflifeclub.com/health
```

### Test Staging Functionality

- [ ] Open browser: https://staging.simulation.lightoflifeclub.com
- [ ] Login with test account
- [ ] Create a simulation
- [ ] Verify backend API calls work
- [ ] Check browser console for errors

### Check Logs

```bash
cd /srv/lol/simulation/staging
docker compose -f docker-compose.staging.yml logs --tail=50

# Check for errors
docker compose -f docker-compose.staging.yml logs | grep -i error
```

## Phase 7: Deploy Production

**Only proceed if Staging is working perfectly!**

### Stop Old Production (if running)

```bash
# SSH to Droplet
ssh deploy@<YOUR_DROPLET_IP>

# If old production is running on /srv/lol/simulation
cd /srv/lol/simulation
docker compose down

# Optional: backup old setup
tar -czf ~/simulation-old-$(date +%Y%m%d).tar.gz .
```

### Trigger Production Deploy

- [ ] Merge `main` → `release` branch
  ```bash
  git checkout release
  git merge main
  git push origin release
  ```

- [ ] Watch GitHub Actions
- [ ] Monitor deployment progress

### Verify Production

```bash
# SSH to Droplet
ssh deploy@<YOUR_DROPLET_IP>

# Check production directory
ls -la /srv/lol/simulation/production/

# Check containers
docker ps | grep production

# Expected output:
# simulation_backend_production   ...  0.0.0.0:8000->8000/tcp
# simulation_frontend_production  ...  0.0.0.0:3000->80/tcp

# Test health endpoints
curl http://localhost:3000/health
curl http://localhost:8000/api/health

# Test external domain
curl https://simulation.lightoflifeclub.com/health
```

### Verify Both Environments Running Simultaneously

```bash
# Check all containers
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Should see 4 containers:
# - simulation_backend_production
# - simulation_frontend_production
# - simulation_backend_staging
# - simulation_frontend_staging

# Check ports don't conflict
netstat -tulpn | grep -E '(3000|5173|8000|8001)'
```

## Phase 8: Final Verification

### Test Production

- [ ] Open browser: https://simulation.lightoflifeclub.com
- [ ] Login with real account
- [ ] Run full smoke test
- [ ] Verify all features work

### Test Port Separation

- [ ] Confirm Production on 3000:
  ```bash
  curl -I http://localhost:3000 | head -1
  # Should return: HTTP/1.1 200 OK
  ```

- [ ] Confirm Staging on 5173:
  ```bash
  curl -I http://localhost:5173 | head -1
  # Should return: HTTP/1.1 200 OK
  ```

- [ ] Confirm they're different deployments:
  ```bash
  # Add a test comment in staging code, verify it only appears in staging
  ```

### Test Test Controls (Optional)

- [ ] Go to GitHub: Actions → CI/CD Pipeline → Run workflow
- [ ] Select "Run workflow" dropdown
- [ ] Try `skip_tests: unit`
- [ ] Verify unit tests are skipped in the run

## Phase 9: Monitoring Setup

- [ ] Set up monitoring (section 14.4 of ci-cd.md)
  - UptimeRobot for https://simulation.lightoflifeclub.com/health
  - UptimeRobot for https://staging.simulation.lightoflifeclub.com/health

- [ ] Set up alerts
  - Email notifications
  - Discord/Slack webhooks (optional)

## Phase 10: Documentation

- [ ] Update internal wiki/docs with new ports
- [ ] Document rollback procedure for your team
- [ ] Save this checklist with completion dates

## Rollback Plan (If Something Goes Wrong)

### If Staging Fails
```bash
# Just redeploy from main branch
# Staging is isolated, won't affect production
```

### If Production Fails
```bash
# Option 1: Rollback via GitHub
git checkout release
git reset --hard <PREVIOUS_COMMIT_HASH>
git push --force origin release
# This will trigger re-deployment of old code

# Option 2: Manual rollback on Droplet
cd /srv/lol/simulation/production
docker compose -f docker-compose.production.yml down
# Restore from backup
tar -xzf ~/simulation-old-<DATE>.tar.gz -C /srv/lol/simulation/production
docker compose up -d

# Option 3: Point to old deployment
# If you kept old containers running on different ports
# Update Nginx upstream to point to old ports temporarily
```

## Success Criteria

✅ Staging accessible at staging.simulation.lightoflifeclub.com
✅ Production accessible at simulation.lightoflifeclub.com
✅ Both run simultaneously without conflicts
✅ Health checks return 200 OK for all endpoints
✅ No errors in docker logs
✅ Ports correctly separated (3000 production, 5173 staging, 4173 for local preview only)
✅ Deploy from main → staging works
✅ Deploy from release → production works
✅ Test controls functional (skip_tests works)
✅ Monitoring alerts configured

## Post-Migration Cleanup

After 7 days of stable operation:

- [ ] Remove old backup files from Droplet
- [ ] Archive old workflow backup
- [ ] Update any documentation references to old ports
- [ ] Celebrate! 🎉

---

**Need Help?**

- Check `docs/ci-cd.md` section 14 (Troubleshooting)
- Check `docs/ci-cd-review-summary.md` for architecture diagrams
- Review Docker logs: `docker compose logs -f`
- Check Nginx logs: `tail -f /var/log/nginx/error.log`
