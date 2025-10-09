내 앱 정보는 첨부한 마크다운 파일에 잘 정리되어 있어.

이 앱을 나는 무중단(또는 무중단에 가깝게)으로 CI/CD 환경을 구성해서 production, staging 환경을 모두 지원하고 싶어.

1. 서버: DigitalOcean Droplet (1CPU, 1GB 메모리 VM), 프론트엔드+백엔드 통합 배포
2. CI/CD: Github Actions (Self-hosted-Runner) + Docker (Docker Compose) + Cloudflare Tunnel
3. Test: 각 테스트 레이어마다 Github Actions에서 자동화하되 어떤 테스트를 CI/CD 과정에 포함할지 내 맘대로 조정 가능해야함.
4. 배포 브랜치: release (production), main (staging)
5. Cloudflare tunnel: production (simulation.lightoflifeclub.com), staging (staging.simulation.lightoflifeclub.com)
    * production, staging tunnel 모두 Droplet에서 운용
    * 기존에 Windows 11 노트북에서 운용하던 tunnel은 이제 중단
    * 1개 tunnel로 production, staging 둘 다 커버
위 최종 방향대로 앱 소스코드(src/backend, src/frontend)와 테스트 코드(src/backend/test/, src/frontend/src/test, src/frontend/e2e/)만 있고 그 외에는 아무 준비도 되어있지 않다고 가정했을 때, 처음부터 끝까지 해야할 작업들을 아주 자세하게 단계별로 안내해줘.


현재 내 리포지토리 구조는 다음과 같아:

workspace-root/
├── src/
│   ├── frontend/
│   │   ├── public/            # PWA manifest & icons
│   │   ├── e2e/               # Playwright specs & helpers
│   │   ├── src/               # React app (AppController, pages, components, hooks, services)
│   │   ├── test/              # Vitest setup, mocks, smoke tests
│   │   ├── vite.config.ts     # Vite + PWA configuration
│   │   └── package.json       # Frontend dependencies & scripts
│   └── backend/
│       ├── api/               # FastAPI routers
│       ├── auth/              # Supabase JWT validation
│       ├── services/          # Domain services (simulations, OTP)
│       ├── models/            # Pydantic schemas
│       ├── config/            # Settings/dataclass config
│       ├── tests/             # Pytest suites (unit, integration)
│       ├── simulation_service.py  # Financial simulation engine
│       └── requirements.txt   # Backend dependencies

**Frontend**:
- React 19.1.0 + TypeScript 5.8.4+ + Vite 5.4.10+
- vite-plugin-pwa 0.20.0, MUI 5.14.0+, Tailwind 3.4.4+
- @supabase/supabase-js 2.51.0+
- localStorage/sessionStorage persistence



**Backend**:
- FastAPI 0.116.1+ (Python 3.11.6+)
- Pydantic v2, Supabase client 2.16.0+
- JWT via Supabase JWKS


**Infrastructure**:
- Windows native production (serving internal preview with npm run preview on Windows 11 Notebook 24 hours running) 
- Cloudflare Tunnel: `simulation.lightoflifeclub.com`
- CORS: local dev + tunnel domain

**Production**:
- Frontend: Vite preview on Windows (port 4173)
- Backend: Native Windows + uvicorn (port 8000)
- Access: Cloudflare Tunnel → `https://simulation.lightoflifeclub.com`
- DB: Supabase cloud

이런 상황을 잘 반영해서, 1~14 및 부록 내용을 다시 전달해줄래?


현재 상황: 기존 tunnel은 npm run preview로 Windows 11 Home 노트북에서 돌아가고 있으며 simulation.lightoflifeclub.com hostname을 사용중이다. 원하는 상황: Windows 11 노트북(=local)에서 사용중인 기존 tunnel 이제 사용을 중단하고, Droplet에서 production, preview용 새 tunnel을 2개 운용하려고 한다. 사용자들에게 서버 점검 등을 공지하고 Droplet으로 production과 preview 배포 환경을 모두 옮길 것이다. production은 hostname은 simulation.lightoflifeclub.com, preview hostname은 preview.simulation.lightoflifeclub.com으로 하려고 한다. 그래서 Droplet에 git clone한 내 repostiroy의 release branch가 production 환경을, preview branch치가 preview 환경으로 배포될 수 있도록 해야한다.



Cloudflared Tunnel → Nginx (8080 포트)

Hostname A: simulation.lightoflifeclub.com (Production)

Hostname B: preview.simulation.lightoflifeclub.com (Staging)

Tunnel 1개 + 포트 1개(8080) + 두 사이트 운영

Cloudflared는 “하나의 터널”을 통해 “하나의 포트(8080)”로 들어옴.

Nginx는 “들어온 요청의 Host 헤더 (즉, 도메인 이름)”를 보고 어디로 보낼지 판단.

이렇게 도메인 기반 라우팅(host-based routing) 으로 하나의 포트에서 다중 서비스 제공이 가능해지는 거야.