# CI/CD 구성 가이드 (Windows 임시 환경 → Production & Staging)

이 문서는 **Windows 11 Home 노트북의 임시 개발 환경**을 **DigitalOcean Droplet(1 CPU, 1GB RAM) 기반의 프로덕션 환경**으로 마이그레이션하는 전체 과정을 설명합니다. GitHub Actions Self-Hosted Runner와 Docker를 사용하여 Production과 Staging 환경을 분리하여 무중단 운영합니다.

## ⚠️ 시작하기 전에 - 마이그레이션 개요

### 현재 상태 (마이그레이션 전)

**임시 개발 환경**:
- **위치**: Windows 11 Home 노트북
- **Backend**: FastAPI (포트 8000)
- **Frontend**: `npm run preview` (포트 4173)
- **접근**: Cloudflare Tunnel → `simulation.lightoflifeclub.com`
- **목적**: 내부 테스터용 임시 서비스 (60-100명)

### 목표 상태 (마이그레이션 후)

**프로덕션 CI/CD 환경**:
- **위치**: DigitalOcean Droplet (24/7 운영)
- **Production**: 포트 3000 (Frontend), 8000 (Backend) → `simulation.lightoflifeclub.com`
- **Staging**: 포트 4173 (Frontend), 8001 (Backend) → `staging.simulation.lightoflifeclub.com`
- **배포**: 자동화 (GitHub Actions)
- **고가용성**: 무중단 배포, Health Check

### 마이그레이션 전략

이 가이드는 **병렬 운영 후 전환** 방식을 사용합니다:

1. ✅ **준비 단계**: Droplet에 새 환경 구축 (섹션 3-10)
2. ✅ **검증 단계**: Staging 도메인으로 테스트 (섹션 12)
3. ✅ **전환 단계**: DNS 전환 및 Windows 터널 중단 (섹션 12.4)
4. ✅ **정리 단계**: Windows 환경 백업 후 제거 (섹션 12.5)

**예상 소요 시간**: 3-4시간 (Droplet 구축 2시간 + 검증 1시간 + 전환 30분)

**롤백 계획**: 문제 발생 시 DNS를 다시 Windows로 전환 (5-10분)

## 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [사전 준비사항 및 Windows 환경 문서화](#2-사전-준비사항-및-windows-환경-문서화)
3. [DigitalOcean Droplet 초기 설정](#3-digitalocean-droplet-초기-설정)
4. [Docker 및 Docker Compose 설치](#4-docker-및-docker-compose-설치)
5. [Nginx 설치 및 설정](#5-nginx-설치-및-설정)
6. [Cloudflare Tunnel 재구성 (Windows → Droplet)](#6-cloudflare-tunnel-재구성-windows--droplet)
7. [GitHub Self-Hosted Runner 설정](#7-github-self-hosted-runner-설정)
8. [Docker 및 Docker Compose 파일 생성](#8-docker-및-docker-compose-파일-생성)
9. [GitHub Secrets 및 Variables 설정](#9-github-secrets-및-variables-설정)
10. [GitHub Actions Workflow 설정](#10-github-actions-workflow-설정)
11. [테스트 레이어 제어 설정](#11-테스트-레이어-제어-설정)
12. [마이그레이션 실행 및 검증](#12-마이그레이션-실행-및-검증)
13. [무중단 배포 전략](#13-무중단-배포-전략)
14. [트러블슈팅](#14-트러블슈팅)
15. [부록](#15-부록)

---

## 1. 시스템 아키텍처 개요

### 1.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        GitHub                                │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ main branch  │         │release branch│                  │
│  │  (staging)   │         │ (production) │                  │
│  └──────┬───────┘         └──────┬───────┘                  │
│         │                        │                           │
│         └────────┬───────────────┘                           │
│                  │ Push Event                                │
│                  ▼                                           │
│         ┌────────────────┐                                   │
│         │ GitHub Actions │                                   │
│         │  (CI/CD)       │                                   │
│         └────────┬───────┘                                   │
└──────────────────┼──────────────────────────────────────────┘
                   │
                   │ Trigger Self-Hosted Runner
                   ▼
┌─────────────────────────────────────────────────────────────┐
│            DigitalOcean Droplet (1 CPU, 1GB RAM)            │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │          GitHub Self-Hosted Runner                     │  │
│  │  - Build Docker images                                 │  │
│  │  - Run tests (unit, integration, e2e - 선택적)        │  │
│  │  - Deploy containers                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Cloudflare Tunnel (1개)                   │  │
│  │  - Port 8080 → Nginx                                   │  │
│  └──────────────────────┬────────────────────────────────┘  │
│                         │                                    │
│                         ▼                                    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Nginx (Port 8080)                        │   │
│  │  Host-based Routing:                                  │   │
│  │  - simulation.lightoflifeclub.com → localhost:3000   │   │
│  │  - staging.simulation.lightoflifeclub.com → :4173    │   │
│  └──────┬────────────────────────────┬──────────────────┘   │
│         │                            │                       │
│         ▼                            ▼                       │
│  ┌─────────────────┐         ┌─────────────────┐            │
│  │  Production     │         │  Staging        │            │
│  │  Environment    │         │  Environment    │            │
│  │  /srv/../prod/  │         │  /srv/../staging/ │          │
│  │                 │         │                 │            │
│  │  Docker Compose │         │  Docker Compose │            │
│  │  (Port 3000)    │         │  (Port 4173)    │            │
│  │  ┌───────────┐  │         │  ┌───────────┐  │            │
│  │  │ Frontend  │  │         │  │ Frontend  │  │            │
│  │  │ (Port 80) │  │         │  │ (Port 80) │  │            │
│  │  │ → 3000    │  │         │  │ → 4173    │  │            │
│  │  └─────┬─────┘  │         │  └─────┬─────┘  │            │
│  │        │        │         │        │        │            │
│  │        │ /api   │         │        │ /api   │            │
│  │        ▼        │         │        ▼        │            │
│  │  ┌───────────┐  │         │  ┌───────────┐  │            │
│  │  │ Backend   │  │         │  │ Backend   │  │            │
│  │  │ (FastAPI) │  │         │  │ (FastAPI) │  │            │
│  │  │ (Port 8000)│  │         │  │ (Port 8001)│  │            │
│  │  └───────────┘  │         │  └───────────┘  │            │
│  └─────────────────┘         └─────────────────┘            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 주요 특징

- **단일 Cloudflare Tunnel**: 1개의 터널로 Production과 Staging 모두 커버
- **Host-based Routing**: Nginx가 도메인(Host 헤더)을 기반으로 요청을 적절한 환경으로 라우팅
- **무중단 배포**: Docker Compose의 rolling update와 health check 활용
- **브랜치 기반 배포**: 
  - `release` branch → Production
  - `main` branch → Staging
- **선택적 테스트 실행**: Workflow에서 각 테스트 레이어를 제어 가능

### 1.3 포트 매핑

| 서비스 | 내부 포트 | 외부 접근 |
|--------|----------|----------|
| Nginx (공용 프록시) | 8080 | Cloudflare Tunnel |
| Production - Frontend | 80 | Host 3000 → Nginx 8080 |
| Production - Backend | 8000 | Host 8000 (내부 통신만) |
| Staging - Frontend | 80 | Host 4173 → Nginx 8080 |
| Staging - Backend | 8000 | Host 8001 (내부 통신만) |

**환경별 포트 정리**:

- **Production**: `/srv/lol/simulation/production`
  - Frontend: Host 3000 → Container 80
  - Backend: Host 8000 → Container 8000
  
- **Staging**: `/srv/lol/simulation/staging`
  - Frontend: Host 4173 → Container 80
  - Backend: Host 8001 → Container 8000

- **개발/디버그**: (로컬 개발 시)
  - Frontend Dev: 5173 (`npm run dev`)
  - Frontend Preview: 4173 (`npm run preview`)
  - Backend: 8002

---

## 2. 사전 준비사항 및 Windows 환경 문서화

### 2.1 현재 Windows 환경 정보 수집

마이그레이션을 시작하기 전에 현재 Windows 환경의 설정을 문서화하세요. 문제 발생 시 롤백에 필요합니다.

#### 2.1.1 Windows에서 실행 중인 서비스 확인

**PowerShell에서 실행**:

```powershell
# Backend 프로세스 확인
Get-Process | Where-Object {$_.ProcessName -like "*python*" -or $_.ProcessName -like "*uvicorn*"}

# Frontend 프로세스 확인
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# Cloudflared 프로세스 확인
Get-Process | Where-Object {$_.ProcessName -like "*cloudflared*"}

# 포트 사용 현황 확인
netstat -ano | findstr "8000 4173"
```

#### 2.1.2 Cloudflare Tunnel 설정 백업

**Windows에서 실행**:

```powershell
# Tunnel 목록 확인 및 저장
cloudflared tunnel list > tunnel-backup.txt

# 현재 사용 중인 tunnel 상세 정보
cloudflared tunnel info <TUNNEL_NAME> > tunnel-details.txt

# Tunnel 설정 파일 위치 확인 (일반적으로)
# C:\Users\<USERNAME>\.cloudflared\config.yml
# 이 파일을 별도로 백업하세요
Copy-Item "$env:USERPROFILE\.cloudflared\config.yml" -Destination ".\cloudflared-config-backup.yml"
```

**중요**: `tunnel-backup.txt`, `tunnel-details.txt`, `cloudflared-config-backup.yml` 파일을 안전한 곳에 보관하세요.

#### 2.1.3 환경 변수 백업

현재 Windows 환경에서 사용 중인 환경 변수를 기록하세요:

```powershell
# .env 파일이 있는 경우
# Backend
Get-Content ".\src\backend\.env" > backend-env-backup.txt

# Frontend
Get-Content ".\src\frontend\.env.local" > frontend-env-backup.txt
```

### 2.2 필요한 계정 및 서비스

다음 서비스 계정이 이미 있어야 합니다 (Windows 환경에서 사용 중):

- [x] DigitalOcean 계정 (Droplet 생성용 - 신규 필요)
- [x] Cloudflare 계정 (Tunnel 및 DNS 관리 - 기존 사용 중)
- [x] GitHub 계정 (Repository 및 Actions - 기존 사용 중)
- [x] Supabase 계정 (데이터베이스 및 인증 - 기존 사용 중)
- [x] Solapi 계정 (SMS OTP 발송 - 기존 사용 중)

### 2.3 수집해야 할 정보

**Windows 환경에서 이미 사용 중인** 다음 정보를 Droplet에서도 동일하게 사용합니다:

**Supabase** (기존 값 확인):
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_PUBLISHABLE_KEY`: Anon/Public key
- `SUPABASE_SECRET_KEY`: Service role key (절대 노출 금지)

**Solapi** (기존 값 확인):
- `SOLAPI_API_KEY`: API Key
- `SOLAPI_API_SECRET`: API Secret
- `SOLAPI_SENDER_NUMBER`: 발신 번호

**OTP** (기존 값 확인 또는 신규 생성):
- `OTP_SECRET_KEY`: OTP 암호화 키 (기존 키 사용 시 기존 OTP 코드 유효)

**Cloudflare** (기존 도메인):
- 도메인: `lightoflifeclub.com` (이미 Cloudflare에 등록되어 있음)
- 서브도메인: `simulation.lightoflifeclub.com` (현재 Windows로 라우팅 중)
- 서브도메인: `staging.simulation.lightoflifeclub.com` (신규 생성 필요)

**GitHub**:
- Repository: `SkyDominator/simulation`
- Personal Access Token (Self-hosted runner 등록용 - 신규 생성)

### 2.4 마이그레이션 체크리스트 (시작 전)

다음 항목을 확인한 후 마이그레이션을 시작하세요:

- [ ] Windows 환경의 Cloudflare Tunnel 설정 백업 완료
- [ ] 모든 환경 변수 (Supabase, Solapi, OTP) 값 기록 완료
- [ ] 내부 테스터에게 마이그레이션 일정 공지 완료 (예상 다운타임: 5-10분)
- [ ] 현재 서비스 접속 가능 확인 (`https://simulation.lightoflifeclub.com`)
- [ ] DigitalOcean 계정 준비 완료 (결제 수단 등록)
- [ ] 긴급 연락망 준비 (문제 발생 시 내부 테스터 공지 방법)

### 2.5 롤백 계획

마이그레이션 중 문제 발생 시:

1. **즉시 롤백** (5-10분 소요):
   - Cloudflare Dashboard → DNS 설정 → `simulation.lightoflifeclub.com`의 Tunnel을 Windows Tunnel로 재전환
   - Windows에서 cloudflared 재시작: `cloudflared tunnel run <TUNNEL_NAME>`
   - 서비스 접근 확인

2. **Windows 환경 유지**:
   - Droplet 환경 디버깅
   - 문제 해결 후 재시도

**중요**: Droplet 구축이 완료되고 검증되기 전까지 Windows 환경을 절대 중단하지 마세요.

---

## 3. DigitalOcean Droplet 초기 설정

### 3.1 Droplet 생성

1. **DigitalOcean 대시보드 접속**
   - https://cloud.digitalocean.com/ 로그인

2. **Create > Droplets 선택**

3. **Droplet 설정**:
   - **Image**: Ubuntu 22.04 LTS (x64)
   - **Plan**: Basic
   - **CPU options**: Regular (1 vCPU, 1GB RAM, 25GB SSD) - 약 $6/월
   - **Datacenter region**: Singapore 또는 가까운 지역 선택
   - **Authentication**: SSH keys (권장) 또는 Password
   - **Hostname**: `simulation-prod-staging`
   - **Tags**: `production`, `staging`, `ci-cd`

4. **Create Droplet** 클릭

5. **IP 주소 확인**:
   - 생성된 Droplet의 Public IP를 메모 (예: `157.245.xxx.xxx`)

### 3.2 초기 서버 접속

```bash
# SSH로 Droplet 접속
ssh root@<DROPLET_IP>

# 예시
ssh root@157.245.xxx.xxx
```

### 3.3 시스템 업데이트 및 기본 패키지 설치

```bash
# 시스템 업데이트
apt update && apt upgrade -y

# 필수 패키지 설치
apt install -y curl wget git build-essential software-properties-common \
  apt-transport-https ca-certificates gnupg lsb-release ufw

# 타임존 설정 (한국 시간)
timedatectl set-timezone Asia/Seoul
```

### 3.4 배포 사용자 생성

보안을 위해 `deploy` 사용자를 생성합니다:

```bash
# deploy 사용자 생성
adduser deploy

# sudo 권한 부여
usermod -aG sudo deploy

# Docker 그룹 추가 (나중에 사용)
groupadd docker
usermod -aG docker deploy

# deploy 사용자로 전환
su - deploy
```

### 3.5 방화벽 설정

```bash
# 다시 root로 전환
exit  # deploy에서 나가기

# UFW 방화벽 설정
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 8080/tcp  # Nginx (Cloudflare Tunnel에서만 접근)
ufw enable

# 상태 확인
ufw status
```

출력 예시:
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
8080/tcp                   ALLOW       Anywhere
```

### 3.6 Swap 메모리 설정 (1GB RAM이므로 필수)

```bash
# 2GB Swap 생성
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 영구 적용
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab

# 확인
free -h
```

---

## 4. Docker 및 Docker Compose 설치

### 4.1 Docker 설치

```bash
# Docker GPG 키 추가
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Docker repository 추가
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Docker 설치
apt update
apt install -y docker-ce docker-ce-cli containerd.io

# Docker 서비스 시작 및 부팅 시 자동 시작 설정
systemctl start docker
systemctl enable docker

# Docker 버전 확인
docker --version
```

### 4.2 Docker Compose 설치

```bash
# Docker Compose V2 (plugin 방식) 설치
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# 버전 확인
docker compose version
```

출력 예시: `Docker Compose version v2.x.x`

### 4.3 Docker 권한 설정

```bash
# deploy 사용자를 docker 그룹에 추가 (이미 추가했지만 확인)
usermod -aG docker deploy

# 변경사항 적용을 위해 deploy 사용자로 재로그인
su - deploy

# Docker 명령어 테스트
docker ps

# 다시 root로 복귀
exit
```


---

## 5. Nginx 설치 및 설정

Nginx는 단일 포트(8080)에서 Host 헤더를 기반으로 Production과 Staging을 라우팅합니다.

### 5.1 Nginx 설치

```bash
# Nginx 설치
apt install -y nginx

# Nginx 시작 및 부팅 시 자동 시작 설정
systemctl start nginx
systemctl enable nginx

# 버전 확인
nginx -v
```

### 5.2 Nginx 설정 파일 생성

#### 5.2.1 기본 설정 제거

```bash
# 기본 사이트 설정 제거
rm /etc/nginx/sites-enabled/default
```

#### 5.2.2 메인 설정 파일 생성

```bash
cat > /etc/nginx/sites-available/simulation << 'EOF'
# Upstream definitions
upstream production_frontend {
    server localhost:3000;
}

upstream staging_frontend {
    server localhost:4173;
}

# Production Server Block
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://production_frontend/health;
        access_log off;
    }
}

# Staging Server Block
server {
    listen 8080;
    server_name staging.simulation.lightoflifeclub.com;

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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://staging_frontend/health;
        access_log off;
    }
}
EOF
```

#### 5.2.3 설정 활성화

```bash
# Symlink 생성
ln -s /etc/nginx/sites-available/simulation /etc/nginx/sites-enabled/

# 설정 테스트
nginx -t

# Nginx 재시작
systemctl restart nginx

# 상태 확인
systemctl status nginx
```

예상 출력:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

---

## 6. Cloudflare Tunnel 재구성 (Windows → Droplet)

이 섹션에서는 Windows에서 실행 중인 Cloudflare Tunnel을 중단하고, Droplet에서 새 터널을 생성합니다. **DNS 전환은 섹션 12.4에서 진행**하므로, 여기서는 터널 생성만 수행합니다.

### 6.1 Windows 터널 정보 확인 (참고용)

마이그레이션 전에 Windows 터널 설정을 확인해두세요 (섹션 2.1.2에서 백업한 파일 참조):

```powershell
# Windows PowerShell에서 실행
cloudflared tunnel list
# 출력 예시:
# ID                                   NAME              CREATED
# abc12345-6789-...                    old-tunnel        2024-XX-XX

cloudflared tunnel info <TUNNEL_NAME>
```

**중요**: Windows 터널은 아직 중단하지 마세요. Droplet 환경이 완전히 검증된 후 섹션 12.4에서 중단합니다.

### 6.2 Droplet에 cloudflared 설치

**중요**: 항상 최신 버전을 확인하세요: [Cloudflared Releases](https://github.com/cloudflare/cloudflared/releases/latest)

```bash
# 최신 버전 확인 (선택사항)
curl -s https://api.github.com/repos/cloudflare/cloudflared/releases/latest | grep -o '"tag_name": *"[^"]*"' | sed 's/.*"\(.*\)"/\1/'

# cloudflared 다운로드 및 설치 (2025년 10월 기준: 2025.9.1)
# 'latest' URL을 사용하면 항상 최신 버전 다운로드
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
dpkg -i cloudflared.deb

# 버전 확인
cloudflared --version
```

### 6.3 Cloudflare 인증

```bash
# Cloudflare 인증 (브라우저 창이 열림)
cloudflared tunnel login
```

> **주의**: SSH 세션에서는 브라우저가 열리지 않으므로, 출력된 URL을 복사하여 로컬 브라우저에서 열고 인증하세요.

인증이 완료되면 `/root/.cloudflared/cert.pem` 파일이 생성됩니다.

### 6.4 터널 생성

```bash
# 터널 생성 (이름: simulation-tunnel)
cloudflared tunnel create simulation-tunnel
```

출력 예시:
```
Tunnel credentials written to /root/.cloudflared/<TUNNEL_ID>.json
Created tunnel simulation-tunnel with id <TUNNEL_ID>
```

**중요**: `<TUNNEL_ID>`를 메모하세요. (예: `3a97bb01-c92d-4678-957f-68b66061a0e3`)

### 6.5 DNS 레코드 생성

#### 6.5.1 Production DNS

```bash
cloudflared tunnel route dns simulation-tunnel simulation.lightoflifeclub.com
```

#### 6.5.2 Staging DNS

```bash
cloudflared tunnel route dns simulation-tunnel staging.simulation.lightoflifeclub.com
```

확인:
```
Cloudflare Dashboard → DNS → Records
- simulation.lightoflifeclub.com (CNAME to <TUNNEL_ID>.cfargotunnel.com)
- staging.simulation.lightoflifeclub.com (CNAME to <TUNNEL_ID>.cfargotunnel.com)
```

### 6.6 터널 설정 파일 생성

```bash
# 설정 디렉토리 생성
mkdir -p /etc/cloudflared

# 설정 파일 생성
cat > /etc/cloudflared/config.yml << 'EOF'
tunnel: <TUNNEL_ID>
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: simulation.lightoflifeclub.com
    service: http://localhost:8080
  - hostname: staging.simulation.lightoflifeclub.com
    service: http://localhost:8080
  - service: http_status:404
EOF
```

**중요**: `<TUNNEL_ID>`를 실제 터널 ID로 교체하세요.

### 6.7 터널을 시스템 서비스로 설정

```bash
# 서비스 설치
cloudflared service install

# 서비스 시작
systemctl start cloudflared

# 부팅 시 자동 시작 설정
systemctl enable cloudflared

# 상태 확인
systemctl status cloudflared
```

예상 출력:
```
● cloudflared.service - cloudflared
     Loaded: loaded (/etc/systemd/system/cloudflared.service; enabled)
     Active: active (running) since ...
```

### 6.8 터널 연결 확인

```bash
# 로그 확인
journalctl -u cloudflared -f

# 터널 상태 확인 (Cloudflare Dashboard)
# Zero Trust → Access → Tunnels → simulation-tunnel (Status: HEALTHY)
```

### 6.9 Windows 터널 제거 (마이그레이션 후 - 섹션 12.5에서 진행)

**주의**: 이 단계는 **마이그레이션 완료 후 24시간 경과 후**에 진행합니다. 섹션 12.4에서 Windows 터널을 중단한 후, 24시간 동안 안정성을 확인한 뒤 Cloudflare에서 완전히 제거합니다.

**Windows PowerShell에서 (마이그레이션 24시간+ 후)**:

```powershell
# 기존 Windows 터널 목록 확인
cloudflared tunnel list

# 기존 터널 삭제
cloudflared tunnel delete <OLD_TUNNEL_NAME>

# 삭제 확인
cloudflared tunnel list
# 기존 터널이 목록에 없으면 성공
```

**Cloudflare Dashboard에서 확인**:
- Zero Trust → Access → Tunnels
- 기존 Windows 터널이 목록에서 제거되었는지 확인
- Droplet의 `simulation-tunnel`만 HEALTHY 상태로 표시되어야 함

---

## 7. GitHub Self-Hosted Runner 설정

### 7.1 Runner 사용자 디렉토리 생성

```bash
# deploy 사용자로 전환
su - deploy

# Runner 디렉토리 생성
mkdir -p ~/actions-runner
cd ~/actions-runner
```

### 7.2 GitHub에서 Runner 토큰 획득

1. **GitHub Repository 접속**
   - https://github.com/SkyDominator/simulation

2. **Settings → Actions → Runners → New self-hosted runner 클릭**

3. **Runner 설정 정보 복사**
   - Linux, x64 선택
   - Download 및 Configure 명령어가 표시됨

### 7.3 Runner 다운로드 및 설치

**중요**: 항상 최신 버전을 확인하세요: https://github.com/actions/runner/releases/latest

```bash
# 최신 버전 확인 (선택사항)
curl -s https://api.github.com/repos/actions/runner/releases/latest | grep -o '"tag_name": *"[^"]*"' | sed 's/.*"v\(.*\)"/\1/'

# Runner 다운로드 (2025년 10월 기준 최신 버전: v2.328.0)
# 최신 버전으로 교체하세요
curl -o actions-runner-linux-x64-2.328.0.tar.gz -L \
  https://github.com/actions/runner/releases/download/v2.328.0/actions-runner-linux-x64-2.328.0.tar.gz

# 압축 해제
tar xzf ./actions-runner-linux-x64-2.328.0.tar.gz

# 설치 스크립트 실행
./config.sh --url https://github.com/SkyDominator/simulation \
  --token <GITHUB_RUNNER_TOKEN>
```

**프롬프트 응답**:
- Enter the name of the runner group: `[Press Enter for default]`
- Enter the name of runner: `droplet-runner`
- Enter any additional labels: `linux,droplet`
- Enter name of work folder: `[Press Enter for default]`

### 7.4 Runner를 서비스로 등록

```bash
# deploy 사용자에서 나가기
exit

# root로 서비스 설치
cd /home/deploy/actions-runner
./svc.sh install deploy

# 서비스 시작
./svc.sh start

# 상태 확인
./svc.sh status
```

### 7.5 GitHub에서 Runner 확인

GitHub Repository → Settings → Actions → Runners에서 `droplet-runner`가 **Idle** 상태로 표시되면 성공입니다.

---

## 8. Docker 및 Docker Compose 파일 수정

### 8.1 프로젝트 디렉토리 구조 생성

**중요**: Production과 Staging은 완전히 분리된 디렉토리에 배포됩니다.

```bash
# 배포 디렉토리 생성
mkdir -p /srv/lol/simulation/production
mkdir -p /srv/lol/simulation/staging
chown -R deploy:deploy /srv/lol/simulation

# 디렉토리 구조 확인
tree /srv/lol/simulation -L 2
# 결과:
# /srv/lol/simulation
# ├── production/  ← release 브랜치 배포 위치
# └── staging/     ← main 브랜치 배포 위치
```

### 8.2 Production 환경용 Docker Compose 파일

**파일 위치**: Repository Root → `docker-compose.production.yml`

이 파일은 Production 환경을 정의합니다. Frontend는 포트 3000, Backend는 포트 8000을 사용합니다.

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

### 8.3 Staging 환경용 Docker Compose 파일

**파일 위치**: Repository Root → `docker-compose.staging.yml`

이 파일은 Staging 환경을 정의합니다. Frontend는 포트 4173, Backend는 포트 8001을 사용합니다.

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

### 8.4 Backend Dockerfile 수정

**파일 위치**: `src/backend/Dockerfile`

```dockerfile
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install system dependencies including curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    libpq-dev \
    curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install dependencies
COPY ./src/backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./src/backend /app

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Run with single worker for 1GB RAM
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
```

### 8.5 Frontend Dockerfile 수정

**파일 위치**: `src/frontend/Dockerfile`

```dockerfile
# Multi-stage build for optimized image size

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

# Stage 2: Production
FROM nginx:stable-alpine

# Copy nginx configuration
COPY ./config/nginx/frontend.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 8.6 Frontend Nginx Config 수정 (컨테이너 내부)

**파일 위치**: `config/nginx/frontend.conf`

**중요**: 이 설정은 frontend 컨테이너 내부의 Nginx 설정입니다. Backend로의 프록시는 Docker 네트워크를 통해 `backend` 서비스명으로 연결됩니다.

```nginx
server {
  listen 80;
  server_name _;

  root /usr/share/nginx/html;
  index index.html;

  # Enable gzip compression
  gzip on;
  gzip_vary on;
  gzip_min_length 1024;
  gzip_types text/plain text/css text/xml text/javascript 
             application/x-javascript application/xml+rss 
             application/javascript application/json image/svg+xml;

  # Security headers
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  # SPA routing - serve index.html for all routes
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Proxy API requests to backend (Docker service name)
  location /api/ {
    proxy_pass http://backend:8000/api/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
  }

  # Health check endpoint
  location /health {
    proxy_pass http://backend:8000/api/health;
    access_log off;
  }

  # Cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

**설명**:
- Production과 Staging 모두 동일한 nginx config 사용
- Docker Compose 내에서 서비스명은 항상 `backend`로 통일
- Production과 Staging의 분리는 호스트의 Nginx(포트 8080)에서 처리

---

## 9. GitHub Secrets 및 Variables 설정

### 9.1 Repository Secrets 설정

GitHub Repository → Settings → Secrets and variables → Actions → Secrets

**Production Environment Secrets**:

1. **New repository secret** 클릭 후 다음 추가:
   - `SUPABASE_SECRET_KEY`: Supabase Service Role Key
   - `SOLAPI_API_SECRET`: Solapi API Secret
   - `SOLAPI_SENDER_NUMBER`: SMS 발신 번호
   - `OTP_SECRET_KEY`: OTP 암호화 키 (랜덤 생성 권장)

**Staging Environment Secrets** (Production과 동일하거나 별도):

동일한 방식으로 Staging용 Secrets 추가 (테스트용으로 분리하려면 별도 Supabase 프로젝트 사용 권장)

### 9.2 Repository Variables 설정

GitHub Repository → Settings → Secrets and variables → Actions → Variables

**Production Environment Variables**:

1. **New repository variable** 클릭 후 다음 추가:
   - `VITE_API_BASE_URL`: `https://simulation.lightoflifeclub.com/api`
   - `VITE_SUPABASE_URL`: Supabase Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase Anon Key
   - `SUPABASE_URL`: (Backend용, 동일)
   - `SUPABASE_PUBLISHABLE_KEY`: (Backend용, 동일)
   - `SOLAPI_API_KEY`: Solapi API Key

**Staging Environment Variables**:

1. **New repository variable** 클릭 후 다음 추가:
   - `VITE_API_BASE_URL`: `https://staging.simulation.lightoflifeclub.com/api`
   - `VITE_SUPABASE_URL`: Supabase Project URL (또는 별도 프로젝트)
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase Anon Key
   - `SUPABASE_URL`: (Backend용)
   - `SUPABASE_PUBLISHABLE_KEY`: (Backend용)
   - `SOLAPI_API_KEY`: Solapi API Key

### 9.3 GitHub Environments 생성

1. **GitHub Repository → Settings → Environments**

2. **New environment** 클릭:
   - **Name**: `production`
   - **Deployment protection rules**:
     - Required reviewers: 체크 (선택사항, 1명 이상)
     - Wait timer: 체크 안 함
   - **Environment secrets**: 위에서 설정한 Secrets를 여기서도 환경별로 설정
   - **Environment variables**: 위에서 설정한 Variables를 여기서도 환경별로 설정

3. **New environment** 클릭:
   - **Name**: `staging`
   - 동일한 방식으로 설정

**중요**: Environment 레벨에서 Secrets/Variables를 설정하면 더 안전하고 관리가 용이합니다.

---

## 10. GitHub Actions Workflow 설정

### 10.1 Workflow 파일 생성 (완전히 새로 작성)

**파일 위치**: `.github/workflows/ci-cd.yml`

**주의**: 기존 workflow 파일이 있다면 아래 내용으로 **완전히 교체**하세요.

```yaml
name: CI/CD Pipeline (Production & Staging)

on:
  push:
    branches:
      - release       # Production trigger
      - main          # Staging trigger
  workflow_dispatch:
    inputs:
      environment:
        description: 'Deploy environment (production / staging)'
        required: true
        default: 'staging'
        type: choice
        options:
          - production
          - staging
      skip_tests:
        description: 'Skip test layers (comma-separated: unit,integration,e2e)'
        required: false
        default: ''
        type: string

jobs:
  # Test control: Unit & Integration Tests
  test-unit:
    name: Unit Tests
    if: |
      !contains(github.event.inputs.skip_tests, 'unit')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: src/frontend/package-lock.json

      - name: Frontend Unit Tests
        working-directory: src/frontend
        run: |
          npm ci
          npm run test:run

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: src/backend/requirements.txt

      - name: Backend Unit Tests
        working-directory: src/backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pytest tests/unit -v

  test-integration:
    name: Integration Tests
    if: |
      !contains(github.event.inputs.skip_tests, 'integration')
    runs-on: ubuntu-latest
    needs: test-unit
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: src/backend/requirements.txt

      - name: Backend Integration Tests
        working-directory: src/backend
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SECRET_KEY: ${{ secrets.SUPABASE_SECRET_KEY }}
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
          pytest tests/integration -v

  # Lint checks
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: src/frontend/package-lock.json

      - name: Frontend Lint
        working-directory: src/frontend
        run: |
          npm ci
          npm run lint

  # Build Docker images
  build:
    name: Build & Push Docker Images
    needs: [test-unit, test-integration, lint]
    if: |
      always() &&
      (needs.test-unit.result == 'success' || needs.test-unit.result == 'skipped') &&
      (needs.test-integration.result == 'success' || needs.test-integration.result == 'skipped') &&
      needs.lint.result == 'success'
    runs-on: ubuntu-latest
    outputs:
      should_deploy_production: ${{ steps.check.outputs.production }}
      should_deploy_staging: ${{ steps.check.outputs.staging }}
    steps:
      - uses: actions/checkout@v4

      - name: Check deployment target
        id: check
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/release" ]] || [[ "${{ github.event.inputs.environment }}" == "production" ]]; then
            echo "production=true" >> $GITHUB_OUTPUT
            echo "staging=false" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/main" ]] || [[ "${{ github.event.inputs.environment }}" == "staging" ]]; then
            echo "production=false" >> $GITHUB_OUTPUT
            echo "staging=true" >> $GITHUB_OUTPUT
          else
            echo "production=false" >> $GITHUB_OUTPUT
            echo "staging=false" >> $GITHUB_OUTPUT
          fi

  # Deploy to Production
  deploy-production:
    name: Deploy to Production
    needs: build
    if: needs.build.outputs.should_deploy_production == 'true'
    runs-on: [self-hosted, linux, droplet]
    environment: production
    steps:
      - uses: actions/checkout@v4
        with:
          ref: release

      - name: Create deployment directory
        run: |
          DEPLOY_DIR="/srv/lol/simulation/production"
          mkdir -p "$DEPLOY_DIR"
          cd "$DEPLOY_DIR"
          
          # Copy source code to deployment directory
          rsync -av --delete \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='__pycache__' \
            --exclude='.env' \
            $GITHUB_WORKSPACE/ ./

      - name: Create .env file
        run: |
          DEPLOY_DIR="/srv/lol/simulation/production"
          cat > "$DEPLOY_DIR/.env" << EOF
          ENV=production
          VITE_API_BASE_URL=${{ vars.VITE_API_BASE_URL }}
          VITE_SUPABASE_URL=${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY=${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}
          SUPABASE_URL=${{ vars.SUPABASE_URL }}
          SUPABASE_PUBLISHABLE_KEY=${{ vars.SUPABASE_PUBLISHABLE_KEY }}
          SUPABASE_SECRET_KEY=${{ secrets.SUPABASE_SECRET_KEY }}
          SOLAPI_API_KEY=${{ vars.SOLAPI_API_KEY }}
          SOLAPI_API_SECRET=${{ secrets.SOLAPI_API_SECRET }}
          SOLAPI_SENDER_NUMBER=${{ secrets.SOLAPI_SENDER_NUMBER }}
          OTP_SECRET_KEY=${{ secrets.OTP_SECRET_KEY }}
          EOF

      - name: Build and Deploy
        run: |
          cd /srv/lol/simulation/production
          docker compose -f docker-compose.production.yml pull || true
          docker compose -f docker-compose.production.yml build --no-cache
          docker compose -f docker-compose.production.yml up -d --remove-orphans

      - name: Health Check
        run: |
          echo "Waiting for Production services to be healthy..."
          for i in {1..20}; do
            sleep 3
            if curl -f http://localhost:3000/health > /dev/null 2>&1; then
              echo "✅ Production is healthy (port 3000)"
              exit 0
            fi
            echo "Attempt $i/20 - waiting..."
          done
          echo "❌ Production health check failed"
          cd /srv/lol/simulation/production
          docker compose -f docker-compose.production.yml logs --tail=100
          exit 1

      - name: Cleanup old images
        run: |
          docker image prune -f
          docker volume prune -f

  # Deploy to Staging
  deploy-staging:
    name: Deploy to Staging
    needs: build
    if: needs.build.outputs.should_deploy_staging == 'true'
    runs-on: [self-hosted, linux, droplet]
    environment: staging
    steps:
      - uses: actions/checkout@v4
        with:
          ref: main

      - name: Create deployment directory
        run: |
          DEPLOY_DIR="/srv/lol/simulation/staging"
          mkdir -p "$DEPLOY_DIR"
          cd "$DEPLOY_DIR"
          
          # Copy source code to deployment directory
          rsync -av --delete \
            --exclude='.git' \
            --exclude='node_modules' \
            --exclude='__pycache__' \
            --exclude='.env' \
            $GITHUB_WORKSPACE/ ./

      - name: Create .env file
        run: |
          DEPLOY_DIR="/srv/lol/simulation/staging"
          cat > "$DEPLOY_DIR/.env" << EOF
          ENV=staging
          VITE_API_BASE_URL=${{ vars.VITE_API_BASE_URL }}
          VITE_SUPABASE_URL=${{ vars.VITE_SUPABASE_URL }}
          VITE_SUPABASE_PUBLISHABLE_KEY=${{ vars.VITE_SUPABASE_PUBLISHABLE_KEY }}
          SUPABASE_URL=${{ vars.SUPABASE_URL }}
          SUPABASE_PUBLISHABLE_KEY=${{ vars.SUPABASE_PUBLISHABLE_KEY }}
          SUPABASE_SECRET_KEY=${{ secrets.SUPABASE_SECRET_KEY }}
          SOLAPI_API_KEY=${{ vars.SOLAPI_API_KEY }}
          SOLAPI_API_SECRET=${{ secrets.SOLAPI_API_SECRET }}
          SOLAPI_SENDER_NUMBER=${{ secrets.SOLAPI_SENDER_NUMBER }}
          OTP_SECRET_KEY=${{ secrets.OTP_SECRET_KEY }}
          EOF

      - name: Build and Deploy
        run: |
          cd /srv/lol/simulation/staging
          docker compose -f docker-compose.staging.yml pull || true
          docker compose -f docker-compose.staging.yml build --no-cache
          docker compose -f docker-compose.staging.yml up -d --remove-orphans

      - name: Health Check
        run: |
          echo "Waiting for Staging services to be healthy..."
          for i in {1..20}; do
            sleep 3
            if curl -f http://localhost:4173/health > /dev/null 2>&1; then
              echo "✅ Staging is healthy (port 4173)"
              exit 0
            fi
            echo "Attempt $i/20 - waiting..."
          done
          echo "❌ Staging health check failed"
          cd /srv/lol/simulation/staging
          docker compose -f docker-compose.staging.yml logs --tail=100
          exit 1

      - name: Cleanup old images
        run: |
          docker image prune -f
          docker volume prune -f

  # E2E Tests (Optional, runs after staging deployment)
  test-e2e:
    name: E2E Tests (Playwright)
    needs: deploy-staging
    if: |
      !contains(github.event.inputs.skip_tests, 'e2e') &&
      needs.deploy-staging.result == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'npm'
          cache-dependency-path: src/frontend/package-lock.json

      - name: Install dependencies
        working-directory: src/frontend
        run: npm ci

      - name: Install Playwright browsers
        working-directory: src/frontend
        run: npx playwright install --with-deps

      - name: Run E2E tests
        working-directory: src/frontend
        env:
          BASE_URL: https://staging.simulation.lightoflifeclub.com
        run: npm run test:e2e

      - name: Upload test results
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: src/frontend/playwright-report/
          retention-days: 7
```

### 10.2 Workflow 파일 커밋

```bash
# 로컬에서 또는 GitHub UI에서 파일을 추가하고 커밋
git add .github/workflows/ci-cd.yml
git commit -m "Add comprehensive CI/CD workflow with test controls"
git push origin main
```

---

## 11. 테스트 레이어 제어 설정

### 11.1 수동 배포 시 테스트 선택

GitHub Actions에서 `workflow_dispatch` 이벤트를 통해 수동으로 배포할 때 테스트를 선택적으로 스킵할 수 있습니다.

**사용 방법**:

1. GitHub Repository → Actions
2. "CI/CD Pipeline (Production & Staging)" 선택
3. "Run workflow" 클릭
4. 옵션 설정:
   - **environment**: `production` 또는 `staging`
   - **skip_tests**: 스킵할 테스트를 쉼표로 구분 (예: `unit,e2e`, `integration`, 빈 칸 = 모든 테스트 실행)

### 11.2 조건부 테스트 실행 설정

Workflow 파일에서 각 테스트 job은 다음과 같이 조건을 체크합니다:

```yaml
jobs:
  test-unit:
    if: |
      !contains(github.event.inputs.skip_tests, 'unit')
    # ...

  test-integration:
    if: |
      !contains(github.event.inputs.skip_tests, 'integration')
    # ...

  test-e2e:
    if: |
      !contains(github.event.inputs.skip_tests, 'e2e') &&
      needs.deploy-staging.result == 'success'
    # ...
```

### 11.3 테스트 레이어별 설명

| 테스트 레이어 | 실행 위치 | 목적 | 실행 시간 |
|--------------|----------|------|----------|
| **Unit** | GitHub Hosted Runner | 개별 함수/컴포넌트 검증 | ~2-5분 |
| **Integration** | GitHub Hosted Runner | API 엔드포인트 통합 검증 | ~3-7분 |
| **E2E** | GitHub Hosted Runner | 실제 사용자 시나리오 검증 | ~10-20분 |

**권장 전략**:

- **Production 배포**: 모든 테스트 통과 필수
- **Staging 배포**: E2E 선택적 실행 (빠른 반복 개발)
- **Hotfix 배포**: Unit + Integration만 실행하여 시간 단축

### 11.4 pytest 마커를 이용한 세부 제어 (Backend)

**파일 위치**: `src/backend/pytest.ini`

```ini
[pytest]
markers =
    unit: Unit tests (fast, no external dependencies)
    integration: Integration tests (database, API calls)
    slow: Slow tests (can be skipped for quick feedback)
    security: Security-focused tests
```

**테스트 파일 예시**:

```python
import pytest

@pytest.mark.unit
def test_calculate_bonus():
    # Fast unit test
    pass

@pytest.mark.integration
def test_api_endpoint():
    # Integration test with API calls
    pass

@pytest.mark.slow
@pytest.mark.integration
def test_full_simulation():
    # Comprehensive but slow test
    pass
```

**Workflow에서 사용**:

```yaml
- name: Backend Unit Tests (Fast)
  run: pytest -m "unit" -v

- name: Backend Integration Tests
  run: pytest -m "integration and not slow" -v

- name: Backend All Tests
  run: pytest -v
```

---

## 12. 마이그레이션 실행 및 검증

이 섹션에서는 Droplet 환경을 검증하고, Windows 터널을 중단한 후, DNS를 Droplet으로 전환합니다.

### 12.1 Staging 배포 및 검증 (Droplet)

#### 12.1.1 Staging 배포 실행

**코드 변경 후 main 브랜치에 푸시**:

```bash
git checkout main
git add .
git commit -m "Test staging deployment on Droplet"
git push origin main
```

#### 12.1.2 GitHub Actions 확인

- Repository → Actions → 워크플로우 실행 확인
- 각 job 상태 모니터링 (test-unit, test-integration, lint, build, deploy-staging)

#### 12.1.3 Staging 접속 확인 (새 터널 사용)

**Droplet에서 로컬 테스트**:

```bash
ssh deploy@<DROPLET_IP>

# Staging이 4173 포트에서 실행 중인지 확인
curl http://localhost:4173/health
# 예상 결과: {"status":"healthy"} 또는 HTTP 200

# 컨테이너 상태 확인
docker ps --format "table {{.Names}}\t{{.Ports}}"
# 예상 출력:
# simulation_frontend_staging  0.0.0.0:4173->80/tcp
# simulation_backend_staging   0.0.0.0:8001->8000/tcp
```

**브라우저에서 접속**:

- <https://staging.simulation.lightoflifeclub.com> (새 Droplet 터널)
- 로그인, 시뮬레이션 생성 등 **모든 기능 철저히 테스트**

4. **포트 분리 확인** (Droplet에서):

```bash
ssh deploy@<DROPLET_IP>

# Staging이 4173 포트에서 실행 중인지 확인
curl http://localhost:4173/health
# 예상 결과: {"status":"healthy"} 또는 HTTP 200

# Production이 실행 중이면 3000도 확인
curl http://localhost:3000/health

# 컨테이너 포트 매핑 확인
docker ps --format "table {{.Names}}\t{{.Ports}}"
# 예상 출력:
# simulation_frontend_staging  0.0.0.0:4173->80/tcp
# simulation_backend_staging   0.0.0.0:8001->8000/tcp
# simulation_frontend_production  0.0.0.0:3000->80/tcp
# simulation_backend_production   0.0.0.0:8000->8000/tcp
```

#### 12.1.4 Staging 기능 검증 체크리스트

Droplet Staging 환경에서 다음 기능이 **모두 정상 작동하는지 확인**하세요:

- [ ] Google OAuth 로그인
- [ ] Kakao OAuth 로그인
- [ ] OTP 발송 및 검증
- [ ] 시뮬레이션 생성 (모든 플랜: A, B, C, D, E, F, G, K, P, R)
- [ ] 시뮬레이션 실행 및 결과 조회
- [ ] 공지사항 조회
- [ ] API 응답 시간 확인 (Windows 환경과 비교)
- [ ] 로그에 에러 없음 확인

**검증 통과 기준**: 위 모든 항목이 Windows 환경과 동일하게 작동

### 12.2 Production 배포 (Droplet)

#### 12.2.1 Production 배포 실행

```bash
git checkout release
git merge main
git push origin release
```

#### 12.2.2 GitHub Actions 확인

- Environment protection rules 확인 (설정한 경우 승인 필요)
- deploy-production job 실행 확인

#### 12.2.3 Production 로컬 테스트

**Droplet에서**:

```bash
ssh deploy@<DROPLET_IP>

# Production이 3000 포트에서 실행 중인지 확인
curl http://localhost:3000/health

# 컨테이너 상태 확인
docker ps | grep production
```

**주의**: Production은 아직 **외부에서 접근 불가**합니다 (DNS가 Windows를 가리키고 있음). 섹션 12.4에서 DNS를 전환한 후 외부 접근이 가능합니다.

### 12.3 최종 검증 (마이그레이션 전)

#### 12.3.1 Droplet 환경 최종 점검

```bash
# 모든 컨테이너 정상 실행 확인
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Health check 상태 확인
docker inspect --format='{{.State.Health.Status}}' simulation_backend_production
docker inspect --format='{{.State.Health.Status}}' simulation_backend_staging

# 예상 출력: healthy

# 로그에 에러 없음 확인
cd /srv/lol/simulation/production
docker compose logs --tail=50 | grep -i error

cd /srv/lol/simulation/staging
docker compose logs --tail=50 | grep -i error
```

#### 12.3.2 Windows 환경 최종 확인

**Windows PowerShell에서**:

```powershell
# 현재 Windows 서비스가 정상 작동 중인지 확인
# 브라우저에서 접속
Start-Process "https://simulation.lightoflifeclub.com"

# 로그인 및 기본 기능 테스트
# 문제 없으면 마이그레이션 진행
```

#### 12.3.3 마이그레이션 Go/No-Go 결정

**다음 조건이 모두 충족되면 마이그레이션 진행**:

- [x] Droplet Staging 환경 모든 기능 검증 완료
- [x] Droplet Production 환경 컨테이너 정상 실행
- [x] Windows 환경 정상 작동 중 (롤백 가능 상태)
- [x] 내부 테스터에게 마이그레이션 공지 완료
- [x] 마이그레이션 시간대 확정 (권장: 사용자 적은 시간대)

**하나라도 미충족 시**: 문제 해결 후 재검증

### 12.4 DNS 전환 및 Windows 터널 중단 (마이그레이션 실행)

**예상 다운타임**: 5-10분

#### 12.4.1 내부 테스터 공지

마이그레이션 시작 **10분 전** 공지:

```
[공지] 시스템 업그레이드 진행

오늘 [시간]부터 약 5-10분간 서비스 점검이 진행됩니다.
점검 중에는 일시적으로 서비스 접속이 불가할 수 있습니다.
완료 후 다시 공지드리겠습니다.
```

#### 12.4.2 Windows Cloudflare Tunnel 중단

**Windows PowerShell에서 (관리자 권한)**:

```powershell
# Cloudflared 프로세스 확인
Get-Process | Where-Object {$_.ProcessName -like "*cloudflared*"}

# Cloudflared 서비스 중단 (서비스로 실행 중인 경우)
Stop-Service cloudflared

# 또는 프로세스 직접 종료
Stop-Process -Name cloudflared -Force

# 중단 확인
Get-Process | Where-Object {$_.ProcessName -like "*cloudflared*"}
# 출력 없음 = 중단 성공
```

#### 12.4.3 Cloudflare DNS 확인

**Cloudflare Dashboard에서**:

1. <https://dash.cloudflare.com/> 로그인
2. 도메인 `lightoflifeclub.com` 선택
3. **Zero Trust → Access → Tunnels** 이동
4. `simulation-tunnel` (Droplet) 상태 확인: **HEALTHY** 여부 확인
5. **DNS → Records** 이동
6. 다음 레코드 확인:
   - `simulation.lightoflifeclub.com` → CNAME `<DROPLET_TUNNEL_ID>.cfargotunnel.com` (이미 생성됨, 섹션 6.5.1)
   - `staging.simulation.lightoflifeclub.com` → CNAME `<DROPLET_TUNNEL_ID>.cfargotunnel.com` (이미 생성됨, 섹션 6.5.2)

**중요**: DNS 레코드가 이미 Droplet 터널을 가리키고 있으므로, Windows 터널 중단 시 자동으로 Droplet으로 전환됩니다.

#### 12.4.4 DNS 전파 대기 및 접속 테스트

**DNS 전파 확인** (로컬 컴퓨터에서):

```bash
# DNS 캐시 플러시 (Windows)
ipconfig /flushdns

# 또는 (macOS/Linux)
sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

# DNS 조회 확인
nslookup simulation.lightoflifeclub.com
# A 레코드 또는 CNAME이 Droplet 터널을 가리키는지 확인
```

**브라우저 테스트**:

```bash
# 1-2분 대기 후 브라우저에서 접속
https://simulation.lightoflifeclub.com

# Production 접속 확인
# - 로그인
# - 시뮬레이션 생성
# - 기능 정상 작동 확인

# Staging도 확인
https://staging.simulation.lightoflifeclub.com
```

#### 12.4.5 마이그레이션 완료 확인

**Droplet에서**:

```bash
# Nginx 액세스 로그 실시간 확인
tail -f /var/log/nginx/access.log

# 예상 출력: 외부 IP에서 요청이 들어오는 것을 확인
# 예: 123.45.67.89 - - [date] "GET / HTTP/1.1" 200 ...

# Production 컨테이너 로그 확인
cd /srv/lol/simulation/production
docker compose logs -f --tail=20

# 사용자 요청이 들어오는지 확인
```

**마이그레이션 성공 기준**:

- [x] `https://simulation.lightoflifeclub.com` 접속 성공
- [x] 로그인 및 모든 기능 정상 작동
- [x] Droplet Nginx 로그에 외부 요청 확인
- [x] Windows 터널 중단 확인 (프로세스 없음)

#### 12.4.6 내부 테스터 공지 (완료)

```
[공지] 시스템 업그레이드 완료

업그레이드가 성공적으로 완료되었습니다.
이제 더 안정적인 환경에서 서비스를 이용하실 수 있습니다.
문제 발생 시 즉시 연락 부탁드립니다.
```

### 12.5 Windows 환경 정리 (마이그레이션 후)

**주의**: 마이그레이션 후 **최소 24시간** 동안 Windows 환경을 유지하세요. 안정성 확인 후 제거합니다.

#### 12.5.1 24시간 모니터링

**Droplet에서 모니터링**:

```bash
# 리소스 사용량 확인
htop

# Docker 상태 확인
docker stats

# 에러 로그 확인
docker compose -f /srv/lol/simulation/production/docker-compose.production.yml logs --tail=100 | grep -i error
```

#### 12.5.2 안정성 확인 후 Windows 정리 (24시간+ 경과 후)

**Windows PowerShell에서**:

```powershell
# 1. Cloudflare Tunnel 삭제 (선택사항)
cloudflared tunnel list
cloudflared tunnel delete <OLD_TUNNEL_NAME>

# 2. Backend/Frontend 프로세스 종료 (이미 중단되어 있을 것)
Stop-Process -Name python -Force
Stop-Process -Name node -Force

# 3. 백업 파일 보관
# tunnel-backup.txt, backend-env-backup.txt, frontend-env-backup.txt
# 안전한 곳에 보관 후 로컬 삭제

# 4. Cloudflared 설정 백업
Copy-Item "$env:USERPROFILE\.cloudflared" -Destination ".\cloudflared-backup" -Recurse
```

**Windows 환경 완전 정리** (선택사항):

- Windows에서 프로젝트 디렉토리 정리
- 개발 환경 유지 또는 제거 (재개발 필요 시 유지 권장)

### 12.3 Health Check 모니터링

**Droplet에서 실시간 모니터링**:

```bash
# 컨테이너 상태 확인
docker ps

# Health check 상태 확인
docker inspect --format='{{.State.Health.Status}}' simulation_backend_production
docker inspect --format='{{.State.Health.Status}}' simulation_frontend_production

# 헬스체크 로그 확인
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' simulation_backend_production

# Nginx를 통한 Health check
curl http://localhost:8081/health  # Production
curl http://localhost:8082/health  # Staging
```

---

## 13. 무중단 배포 전략

### 13.1 Docker Compose Rolling Update

Docker Compose는 `up -d` 명령 실행 시 기존 컨테이너를 graceful하게 종료하고 새 컨테이너를 시작합니다.

**무중단 배포를 위한 설정**:

1. **Health Check 활성화** (이미 적용됨):
   - Backend: `HEALTHCHECK` 및 `healthcheck` 설정
   - Frontend: `depends_on` with `condition: service_healthy`

2. **Graceful Shutdown**:

**docker-compose.production.yml에 추가**:

```yaml
  backend-production:
    # ... existing config
    stop_grace_period: 30s  # 종료 전 대기 시간
```

3. **배포 순서**:
   - 새 이미지 빌드
   - Backend 컨테이너 교체 (health check 통과 확인)
   - Frontend 컨테이너 교체

### 13.2 Blue-Green 배포 (고급, 선택사항)

리소스가 충분한 경우, Blue-Green 배포를 구현할 수 있습니다:

**구조**:
```
Production (Blue): Port 8081 ← Active
Production (Green): Port 8083 ← Standby

Nginx가 Blue를 가리킴 → Green 배포 → Green 검증 → Nginx를 Green으로 전환 → Blue 종료
```

**설정 예시** (`docker-compose.blue.yml`, `docker-compose.green.yml`):

```yaml
# docker-compose.green.yml
services:
  frontend-production-green:
    # ... same config as production
    ports:
      - "8083:80"
```

**Nginx 설정 변경**:

```nginx
upstream production_frontend {
    server localhost:8081;  # Blue
    # server localhost:8083;  # Green (스위칭 시 주석 해제)
}
```

**배포 스크립트**:

```bash
#!/bin/bash
# deploy-blue-green.sh

CURRENT=$(cat /etc/nginx/current-env)  # blue or green

if [ "$CURRENT" == "blue" ]; then
  NEW="green"
  NEW_PORT=8083
else
  NEW="blue"
  NEW_PORT=8081
fi

# Deploy to standby environment
docker compose -f docker-compose.$NEW.yml up -d --build

# Health check
for i in {1..20}; do
  if curl -f http://localhost:$NEW_PORT/health; then
    echo "$NEW is healthy"
    break
  fi
  sleep 3
done

# Switch Nginx upstream
sed -i "s/localhost:[0-9]\+/localhost:$NEW_PORT/" /etc/nginx/sites-available/simulation
nginx -s reload

# Update current env
echo "$NEW" > /etc/nginx/current-env

# Stop old environment (optional, after verification)
# docker compose -f docker-compose.$CURRENT.yml down
```

### 13.3 다운타임 최소화 체크리스트

- [x] Health checks 설정됨
- [x] `stop_grace_period` 설정됨
- [x] Nginx upstream keepalive 설정 (선택사항)
- [x] Database migration은 배포 전 수동 실행 (구조 변경 시)
- [x] 롤백 계획 준비
- [x] 배포 전 공지 (필요 시)

**예상 다운타임**:
- 현재 구성: ~10-30초 (컨테이너 교체 시간)
- Blue-Green 구성: ~0-5초 (Nginx reload 시간)

---

## 14. 트러블슈팅

### 14.1 일반적인 문제 및 해결

#### 문제 1: Self-Hosted Runner가 Offline 상태

**증상**: GitHub Actions에서 "No runners available"

**해결**:

```bash
ssh deploy@<DROPLET_IP>
cd ~/actions-runner

# 서비스 상태 확인
sudo ./svc.sh status

# 재시작
sudo ./svc.sh stop
sudo ./svc.sh start

# 로그 확인
journalctl -u actions.runner.* -f
```

#### 문제 2: Docker Compose 빌드 실패

**증상**: "Build failed" 또는 이미지 생성 실패

**해결**:

```bash
# 캐시 없이 재빌드
docker compose -f docker-compose.production.yml build --no-cache

# 디스크 공간 확인
df -h

# 사용하지 않는 이미지 정리
docker system prune -a -f

# 빌드 로그 확인
docker compose -f docker-compose.production.yml build 2>&1 | tee build.log
```

#### 문제 3: Health Check 실패

**증상**: 배포 후 컨테이너가 계속 재시작됨

**해결**:

```bash
# 컨테이너 로그 확인
docker logs simulation_backend_production --tail=100

# Health check 로그 확인
docker inspect --format='{{range .State.Health.Log}}{{.Output}}{{end}}' simulation_backend_production

# 수동 Health check
docker exec simulation_backend_production curl -f http://localhost:8000/api/health

# Backend가 응답하는지 확인
curl http://localhost:8000/api/health
```

**일반적인 원인**:
- 환경 변수 누락 (`.env` 파일 확인)
- Supabase 연결 실패 (네트워크 확인)
- 메모리 부족 (1GB RAM 한계)

#### 문제 4: Cloudflare Tunnel 연결 끊김

**증상**: 도메인 접속 불가, "Error 1000" 또는 "Error 522"

**해결**:

```bash
# Cloudflared 서비스 상태 확인
systemctl status cloudflared

# 재시작
systemctl restart cloudflared

# 로그 확인
journalctl -u cloudflared -f

# 터널 설정 확인
cat /etc/cloudflared/config.yml

# 수동 실행 테스트
cloudflared tunnel --config /etc/cloudflared/config.yml run
```

#### 문제 5: Nginx 502 Bad Gateway

**증상**: 브라우저에서 "502 Bad Gateway"

**해결**:

```bash
# Nginx 상태 확인
systemctl status nginx

# Nginx 설정 테스트
nginx -t

# Upstream 컨테이너 확인
docker ps | grep simulation

# 컨테이너 포트 확인
curl http://localhost:8081
curl http://localhost:8082

# Nginx 로그 확인
tail -f /var/log/nginx/error.log
```

#### 문제 6: 메모리 부족 (OOM Killed)

**증상**: 컨테이너가 갑자기 종료됨, `dmesg`에 "Out of memory"

**해결**:

```bash
# 메모리 사용량 확인
free -h
docker stats --no-stream

# Swap 확인
swapon --show

# 메모리 제한 설정 (docker-compose.yml에 추가)
```

**docker-compose에 메모리 제한 추가**:

```yaml
  backend-production:
    # ... existing config
    mem_limit: 512m
    memswap_limit: 768m
```

### 14.2 로그 수집 및 분석

#### 중앙집중식 로그 확인

```bash
# Production 전체 로그
docker compose -f docker-compose.production.yml logs -f

# Backend만
docker logs simulation_backend_production -f

# Frontend만
docker logs simulation_frontend_production -f

# Nginx 로그
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Cloudflared 로그
journalctl -u cloudflared -f

# System logs
journalctl -xe
```

#### 로그 파일 저장

```bash
# 특정 시간대 로그 추출
docker logs simulation_backend_production --since "2024-01-15T10:00:00" --until "2024-01-15T11:00:00" > backend-issue.log

# 전체 로그 아카이브
mkdir -p ~/logs/$(date +%Y%m%d)
docker compose -f docker-compose.production.yml logs --no-color > ~/logs/$(date +%Y%m%d)/production.log
docker compose -f docker-compose.staging.yml logs --no-color > ~/logs/$(date +%Y%m%d)/staging.log
```

### 14.3 긴급 롤백 절차

**시나리오**: Production 배포 후 심각한 버그 발견

**즉시 조치**:

```bash
# 1. Droplet 접속
ssh deploy@<DROPLET_IP>

# 2. 이전 이미지로 롤백 (태그를 사용하는 경우)
docker tag simulation_backend:production-previous simulation_backend:production
docker tag simulation_frontend:production-previous simulation_frontend:production

# 3. 컨테이너 재시작
docker compose -f docker-compose.production.yml up -d --force-recreate

# 4. Health check 확인
curl http://localhost:8081/health

# 5. 사용자에게 공지
# "일시적 문제 해결됨, 서비스 정상화"
```

**장기 대응**:

```bash
# 1. release 브랜치를 이전 커밋으로 되돌림
git checkout release
git log --oneline  # 이전 커밋 해시 확인
git reset --hard <PREVIOUS_COMMIT_HASH>
git push --force origin release

# 2. 자동 재배포 트리거
# (또는 수동으로 workflow_dispatch 실행)
```

### 14.4 모니터링 및 알림 (고급)

**Uptime 모니터링** (무료 도구):

- UptimeRobot: https://uptimerobot.com/
- 설정: 5분마다 `https://simulation.lightoflifeclub.com/health` 체크
- 알림: 이메일, Slack, Discord 등

**리소스 모니터링**:

```bash
# htop 설치 (실시간 모니터링)
apt install htop
htop

# Docker 리소스 모니터링 스크립트
cat > ~/monitor-docker.sh << 'EOF'
#!/bin/bash
while true; do
  clear
  echo "=== Docker Stats ==="
  docker stats --no-stream
  echo ""
  echo "=== Memory Usage ==="
  free -h
  echo ""
  echo "=== Disk Usage ==="
  df -h /
  sleep 5
done
EOF

chmod +x ~/monitor-docker.sh
./monitor-docker.sh
```

---

## 15. 부록

### 15.1 완전한 파일 체크리스트

배포를 위해 생성/수정해야 할 파일 목록:

#### Repository Root

- [x] `docker-compose.production.yml`
- [x] `docker-compose.staging.yml`
- [x] `.github/workflows/ci-cd.yml`

#### Backend

- [x] `src/backend/Dockerfile` (수정)
- [x] `src/backend/requirements.txt` (의존성 확인)
- [x] `src/backend/pytest.ini` (마커 설정)

#### Frontend

- [x] `src/frontend/Dockerfile` (수정)
- [x] `src/frontend/package.json` (스크립트 확인)

#### Config

- [x] `config/nginx/frontend.production.conf`
- [x] `config/nginx/frontend.staging.conf`

#### Droplet (직접 생성)

- [x] `/etc/nginx/sites-available/simulation`
- [x] `/etc/cloudflared/config.yml`
- [x] `/srv/lol/simulation/` (디렉토리)

### 15.2 환경 변수 전체 목록

#### Production

| 변수명 | 타입 | 설명 | 예시 |
|--------|------|------|------|
| `ENV` | Variable | 환경 구분 | `production` |
| `VITE_API_BASE_URL` | Variable | 프론트엔드 API URL | `https://simulation.lightoflifeclub.com/api` |
| `VITE_SUPABASE_URL` | Variable | Supabase Project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Variable | Supabase Anon Key | `eyJ...` |
| `SUPABASE_URL` | Variable | Backend Supabase URL | `https://xxx.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Variable | Backend Anon Key | `eyJ...` |
| `SUPABASE_SECRET_KEY` | Secret | Supabase Service Role Key | `eyJ...` |
| `SOLAPI_API_KEY` | Variable | Solapi API Key | `NCSA...` |
| `SOLAPI_API_SECRET` | Secret | Solapi API Secret | `xxx` |
| `SOLAPI_SENDER_NUMBER` | Secret | SMS 발신번호 | `01012345678` |
| `OTP_SECRET_KEY` | Secret | OTP 암호화 키 | `random-32-char-string` |

#### Staging

Production과 동일하되, `VITE_API_BASE_URL`은 `https://staging.simulation.lightoflifeclub.com/api`

### 15.3 포트 매핑 요약

| 서비스 | 컨테이너 내부 | Host (Droplet) | 외부 접근 |
|--------|--------------|----------------|----------|
| Backend (Production) | 8000 | 8000 | Docker 내부 네트워크만 |
| Frontend (Production) | 80 | 3000 | Nginx 8080 통해서만 |
| Backend (Staging) | 8000 | 8001 | Docker 내부 네트워크만 |
| Frontend (Staging) | 80 | 4173 | Nginx 8080 통해서만 |
| Nginx (Host) | 8080 | 8080 | Cloudflare Tunnel |
| Cloudflare Tunnel | - | - | 443 (HTTPS) |

**요청 흐름**:

1. 사용자 → `simulation.lightoflifeclub.com` (HTTPS:443)
2. Cloudflare Tunnel → Droplet Nginx (Port 8080)
3. Nginx → Host header 확인
   - `simulation.lightoflifeclub.com` → `localhost:3000` (Production)
   - `staging.simulation.lightoflifeclub.com` → `localhost:4173` (Staging)
4. Frontend 컨테이너 → Backend 컨테이너 (Docker 네트워크 내 `backend:8000`)

**포트 사용 정리**:

- **3000**: Production Frontend (표준 Node.js 프로덕션 포트)
- **4173**: Staging Frontend (Vite preview 서버 포트와 동일)
- **5173**: 로컬 개발 시 `npm run dev` 전용
- **8000**: Production Backend
- **8001**: Staging Backend
- **8002**: 로컬 디버그 Backend (문서화 목적)
- **8080**: Host Nginx (Cloudflare 터널 연결)

### 15.4 유용한 명령어 모음

```bash
# === Docker 관련 ===

# 모든 컨테이너 상태 확인
docker ps -a

# 특정 환경 로그 확인
docker compose -f docker-compose.production.yml logs -f
docker compose -f docker-compose.staging.yml logs -f

# 컨테이너 재시작
docker compose -f docker-compose.production.yml restart

# 완전 재배포 (이미지 재빌드 포함)
docker compose -f docker-compose.production.yml up -d --build --force-recreate

# 디스크 공간 확보
docker system prune -a -f
docker volume prune -f

# === Nginx 관련 ===

# 설정 테스트
nginx -t

# 재시작
systemctl restart nginx

# 로그 확인
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# === Cloudflare Tunnel 관련 ===

# 서비스 재시작
systemctl restart cloudflared

# 상태 확인
systemctl status cloudflared

# 로그 확인
journalctl -u cloudflared -f

# === GitHub Actions Runner 관련 ===

# Runner 상태 확인
cd ~/actions-runner
sudo ./svc.sh status

# Runner 재시작
sudo ./svc.sh restart

# === 시스템 모니터링 ===

# 리소스 사용량
htop
docker stats

# 디스크 공간
df -h

# 메모리 상태
free -h

# 네트워크 연결
netstat -tulpn | grep -E '(8080|8081|8082)'
```

### 15.5 배포 체크리스트

#### 최초 설정 시

- [ ] Droplet 생성 및 초기 설정 완료
- [ ] Docker 및 Docker Compose 설치
- [ ] Nginx 설치 및 설정
- [ ] Cloudflare Tunnel 설정 및 DNS 연결
- [ ] Self-Hosted Runner 설치 및 등록
- [ ] GitHub Secrets 및 Variables 설정
- [ ] GitHub Environments 설정 (production, staging)
- [ ] Docker Compose 파일 생성 (production, staging)
- [ ] Dockerfile 수정 (backend, frontend)
- [ ] Nginx config 생성 (production, staging)
- [ ] Workflow 파일 생성 및 커밋

#### 배포 전 확인사항

- [ ] 모든 테스트 통과 확인 (로컬)
- [ ] 환경 변수 최신 상태 확인
- [ ] Droplet 디스크 공간 충분 (최소 5GB 여유)
- [ ] Droplet 메모리 상태 양호 (Swap 활성화)
- [ ] Cloudflare Tunnel 정상 작동 확인
- [ ] Nginx 설정 정상 확인 (`nginx -t`)
- [ ] 배포 공지 (필요 시)

#### 배포 후 확인사항

- [ ] GitHub Actions 워크플로우 성공 확인
- [ ] 컨테이너 Health check 통과 확인
- [ ] 도메인 접속 확인 (https://simulation.lightoflifeclub.com)
- [ ] 주요 기능 수동 테스트 (로그인, 시뮬레이션 생성 등)
- [ ] 로그에 에러 없음 확인
- [ ] 리소스 사용량 정상 범위 확인 (메모리, CPU, 디스크)

### 15.6 참고 자료

- **Docker 공식 문서**: https://docs.docker.com/
- **Docker Compose 공식 문서**: https://docs.docker.com/compose/
- **Nginx 공식 문서**: https://nginx.org/en/docs/
- **Cloudflare Tunnel 가이드**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **GitHub Actions 공식 문서**: https://docs.github.com/en/actions
- **Self-Hosted Runners**: https://docs.github.com/en/actions/hosting-your-own-runners
- **DigitalOcean Tutorials**: https://www.digitalocean.com/community/tutorials

---

## 결론

### 마이그레이션 완료 상태

이 가이드를 따라 마이그레이션을 완료하면 다음이 달성됩니다:

**마이그레이션 전 (Windows 임시 환경)**:
- ❌ Windows 11 Home 노트북 (불안정, 24/7 운영 불가)
- ❌ 단일 환경 (Production/Staging 분리 없음)
- ❌ 수동 배포 (개발자 직접 실행)
- ❌ 포트 4173 (`npm run preview` - 개발용)

**마이그레이션 후 (Droplet 프로덕션 환경)**:
1. ✅ **DigitalOcean Droplet 24/7 운영** (안정적인 프로덕션 인프라)
2. ✅ **Production과 Staging 완전 분리** (독립적인 테스트 환경)
3. ✅ **단일 Cloudflare Tunnel로 두 도메인 서빙** (비용 효율적)
4. ✅ **Nginx Host-based routing** (유연한 트래픽 관리)
5. ✅ **GitHub Actions Self-Hosted Runner CI/CD 자동화** (코드 푸시 → 자동 배포)
6. ✅ **Docker Compose 컨테이너화** (일관된 배포 환경)
7. ✅ **선택적 테스트 레이어 실행** (유연한 테스트 전략)
8. ✅ **Health check 기반 무중단 배포** (사용자 영향 최소화)
9. ✅ **브랜치별 자동 배포** (release → production, main → staging)
10. ✅ **프로덕션 포트 표준화** (3000 Frontend, 8000 Backend)

### 운영 가이드

**일상적인 배포**:
- Staging 테스트: `git push origin main`
- Production 배포: `git push origin release`
- 긴급 롤백: 섹션 14.3 참조

**모니터링**:
- Health check: `curl https://simulation.lightoflifeclub.com/health`
- Droplet 리소스: `ssh deploy@<IP>`, `htop`, `docker stats`
- 로그: `docker compose logs -f`

**문제 발생 시**:
- 섹션 14 (트러블슈팅) 참조
- 로그 수집 및 분석
- Windows 환경 백업 활용 (24시간 이내)

### 다음 단계 (선택사항)

**고급 기능 구현**:
- Uptime 모니터링 (UptimeRobot, Pingdom)
- 알림 시스템 (Slack, Discord)
- 자동 백업 스크립트
- Blue-Green 배포 전략
- CDN 최적화

**확장 계획**:
- Droplet 업그레이드 (2GB RAM)
- Load Balancer 추가 (다중 Droplet)
- Database 마이그레이션 (Supabase → 자체 호스팅)

---

**축하합니다! Windows 임시 환경에서 프로덕션 CI/CD 환경으로의 마이그레이션이 완료되었습니다! 🚀**

이제 안정적이고 확장 가능한 인프라 위에서 서비스를 운영할 수 있습니다.

