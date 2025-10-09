# CI/CD Quick Reference

이 문서는 CI/CD 구성의 핵심 내용을 빠르게 참조할 수 있도록 요약한 가이드입니다.

전체 상세 가이드는 [docs/ci-cd.md](./ci-cd.md)를 참조하세요.

## 시스템 개요

### 아키텍처

```
GitHub (release/main) 
  ↓ Push Event
GitHub Actions (Hosted Runner - Tests)
  ↓ Trigger
Self-Hosted Runner (Droplet - Build & Deploy)
  ↓ Deploy
Docker Compose (Production:8081 / Staging:8082)
  ↓ Route
Nginx (Host-based routing on port 8080)
  ↓ Expose
Cloudflare Tunnel (Single tunnel, dual hostnames)
  ↓ HTTPS
Users (simulation.lightoflifeclub.com / staging.simulation.lightoflifeclub.com)
```

### 주요 구성 요소

| 구성 요소 | 역할 | 위치 |
|----------|------|------|
| DigitalOcean Droplet | 배포 서버 | 1 CPU, 1GB RAM |
| Self-Hosted Runner | CI/CD 실행 | Droplet 내 |
| Docker Compose | 컨테이너 오케스트레이션 | Production(8081), Staging(8082) |
| Nginx | 역방향 프록시 | Port 8080, Host-based routing |
| Cloudflare Tunnel | 외부 노출 | 단일 터널, 이중 호스트네임 |

## 빠른 시작 단계

### 1단계: Droplet 준비 (30분)

```bash
# Droplet 생성 (Ubuntu 22.04, 1 CPU, 1GB RAM)
# SSH 접속
ssh root@<DROPLET_IP>

# 시스템 업데이트
apt update && apt upgrade -y
apt install -y curl wget git build-essential software-properties-common ufw

# 배포 사용자 생성
adduser deploy
usermod -aG sudo deploy

# Swap 설정 (필수)
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### 2단계: Docker 설치 (10분)

```bash
# Docker 설치
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list
apt update && apt install -y docker-ce docker-ce-cli containerd.io

# Docker Compose 설치
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Deploy 사용자에게 Docker 권한 부여
usermod -aG docker deploy
```

### 3단계: Nginx 설정 (10분)

```bash
# Nginx 설치
apt install -y nginx

# 설정 파일 생성 (상세 내용은 메인 가이드 참조)
# /etc/nginx/sites-available/simulation
# Production: simulation.lightoflifeclub.com → localhost:8081
# Staging: staging.simulation.lightoflifeclub.com → localhost:8082

# 설정 활성화
ln -s /etc/nginx/sites-available/simulation /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 4단계: Cloudflare Tunnel 설정 (15분)

```bash
# Cloudflared 설치
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
dpkg -i cloudflared.deb

# 인증 (브라우저에서 진행)
cloudflared tunnel login

# 터널 생성
cloudflared tunnel create simulation-tunnel

# DNS 라우팅
cloudflared tunnel route dns simulation-tunnel simulation.lightoflifeclub.com
cloudflared tunnel route dns simulation-tunnel staging.simulation.lightoflifeclub.com

# 설정 파일 생성 (/etc/cloudflared/config.yml)
# 서비스로 등록
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

### 5단계: Self-Hosted Runner 설정 (10분)

```bash
# Deploy 사용자로 전환
su - deploy

# Runner 다운로드 및 설치
mkdir -p ~/actions-runner && cd ~/actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz

# GitHub에서 토큰 획득 후 설정
./config.sh --url https://github.com/SkyDominator/simulation --token <TOKEN>

# 서비스로 등록 (root 권한 필요)
exit
cd /home/deploy/actions-runner
./svc.sh install deploy
./svc.sh start
```

### 6단계: GitHub 설정 (20분)

#### Repository Secrets 추가

**Settings → Secrets and variables → Actions → Secrets**

- `SUPABASE_SECRET_KEY`
- `SOLAPI_API_SECRET`
- `SOLAPI_SENDER_NUMBER`
- `OTP_SECRET_KEY`

#### Repository Variables 추가

**Settings → Secrets and variables → Actions → Variables**

Production:
- `VITE_API_BASE_URL=https://simulation.lightoflifeclub.com/api`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SOLAPI_API_KEY`

Staging:
- `VITE_API_BASE_URL=https://staging.simulation.lightoflifeclub.com/api`
- (나머지는 Production과 동일 또는 별도 설정)

#### GitHub Environments 생성

**Settings → Environments**

1. **production** 환경 생성
2. **staging** 환경 생성

### 7단계: 코드 변경 및 배포 (10분)

리포지토리에 다음 파일들을 추가/수정:

1. `docker-compose.production.yml` - Production 환경 설정
2. `docker-compose.staging.yml` - Staging 환경 설정
3. `src/backend/Dockerfile` - curl 추가, healthcheck 설정
4. `src/frontend/Dockerfile` - Multi-stage build, 환경변수 지원
5. `config/nginx/frontend.production.conf` - Production용 Nginx 설정
6. `config/nginx/frontend.staging.conf` - Staging용 Nginx 설정
7. `.github/workflows/ci-cd.yml` - 전체 CI/CD 워크플로우

## 일상적인 작업

### 배포 프로세스

#### Staging 배포

```bash
# 로컬에서
git checkout main
git add .
git commit -m "Your changes"
git push origin main

# 자동으로 GitHub Actions 트리거
# → Tests → Build → Deploy to Staging
```

#### Production 배포

```bash
# 로컬에서
git checkout release
git merge main
git push origin release

# 자동으로 GitHub Actions 트리거
# → Tests → Build → Deploy to Production
```

### 수동 배포 (테스트 선택)

1. GitHub → Actions → "CI/CD Pipeline" 선택
2. "Run workflow" 클릭
3. 옵션 설정:
   - **environment**: `production` 또는 `staging`
   - **skip_tests**: `unit,e2e` (스킵할 테스트, 비워두면 모두 실행)

### 로그 확인

```bash
# Droplet 접속
ssh deploy@<DROPLET_IP>

# Production 로그
docker compose -f docker-compose.production.yml logs -f

# Staging 로그
docker compose -f docker-compose.staging.yml logs -f

# 특정 서비스 로그
docker logs simulation_backend_production -f
docker logs simulation_frontend_staging -f

# Nginx 로그
sudo tail -f /var/log/nginx/error.log

# Cloudflare Tunnel 로그
sudo journalctl -u cloudflared -f
```

### 헬스체크

```bash
# Production
curl http://localhost:8081/health
curl https://simulation.lightoflifeclub.com/health

# Staging
curl http://localhost:8082/health
curl https://staging.simulation.lightoflifeclub.com/health

# Docker health status
docker inspect --format='{{.State.Health.Status}}' simulation_backend_production
```

### 컨테이너 재시작

```bash
# Production 재시작
docker compose -f docker-compose.production.yml restart

# Staging 재시작
docker compose -f docker-compose.staging.yml restart

# 특정 서비스만
docker compose -f docker-compose.production.yml restart backend-production
```

## 트러블슈팅 체크리스트

### 배포 실패 시

1. [ ] GitHub Actions 로그 확인
2. [ ] Self-hosted runner 상태 확인: `sudo ./svc.sh status`
3. [ ] Droplet 디스크 공간 확인: `df -h`
4. [ ] Droplet 메모리 확인: `free -h`
5. [ ] Docker 로그 확인: `docker compose logs`

### 사이트 접속 불가 시

1. [ ] Cloudflare Tunnel 상태: `systemctl status cloudflared`
2. [ ] Nginx 상태: `systemctl status nginx`
3. [ ] 컨테이너 상태: `docker ps`
4. [ ] 포트 리스닝 확인: `netstat -tulpn | grep -E '(8080|8081|8082)'`
5. [ ] 로그 확인: Nginx, Cloudflared, Docker

### 헬스체크 실패 시

1. [ ] Backend 응답 확인: `docker exec <container> curl http://localhost:8000/api/health`
2. [ ] 환경 변수 확인: `docker exec <container> env`
3. [ ] Supabase 연결 확인: 네트워크, 인증키
4. [ ] 메모리 부족 확인: `docker stats`

## 긴급 롤백

```bash
# Droplet 접속
ssh deploy@<DROPLET_IP>

# 이전 이미지로 롤백 (태그 사용)
docker tag simulation_backend:production-previous simulation_backend:production
docker tag simulation_frontend:production-previous simulation_frontend:production

# 재시작
docker compose -f docker-compose.production.yml up -d --force-recreate

# 확인
curl http://localhost:8081/health
```

또는

```bash
# Git에서 롤백
git checkout release
git reset --hard <PREVIOUS_COMMIT>
git push --force origin release
```

## 유용한 명령어

```bash
# Docker 디스크 정리
docker system prune -a -f

# 모든 컨테이너 상태
docker ps -a

# 리소스 모니터링
docker stats --no-stream

# 특정 컨테이너 쉘 접속
docker exec -it simulation_backend_production /bin/bash

# Nginx 설정 리로드
sudo nginx -s reload

# Runner 로그
journalctl -u actions.runner.* -f
```

## 환경별 URL

| 환경 | URL | 컨테이너 포트 | 브랜치 |
|------|-----|--------------|--------|
| **Production** | https://simulation.lightoflifeclub.com | 8081 | release |
| **Staging** | https://staging.simulation.lightoflifeclub.com | 8082 | main |

## 중요 파일 위치

### Droplet

| 경로 | 설명 |
|------|------|
| `/etc/nginx/sites-available/simulation` | Nginx 설정 |
| `/etc/cloudflared/config.yml` | Cloudflare Tunnel 설정 |
| `/home/deploy/actions-runner/` | GitHub Runner |
| `/srv/lol/simulation/` | 배포 디렉토리 (선택) |

### Repository

| 파일 | 설명 |
|------|------|
| `.github/workflows/ci-cd.yml` | CI/CD 워크플로우 |
| `docker-compose.production.yml` | Production 설정 |
| `docker-compose.staging.yml` | Staging 설정 |
| `src/backend/Dockerfile` | Backend 이미지 |
| `src/frontend/Dockerfile` | Frontend 이미지 |
| `config/nginx/frontend.*.conf` | Frontend Nginx 설정 |

## 다음 단계

- [ ] 모니터링 설정 (UptimeRobot 등)
- [ ] 백업 전략 수립
- [ ] 로그 아카이빙 자동화
- [ ] Blue-Green 배포 고려 (리소스 증설 시)
- [ ] CDN 설정 (Static assets)

---

**전체 상세 가이드**: [docs/ci-cd.md](./ci-cd.md)
