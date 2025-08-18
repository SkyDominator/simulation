# 의문점들

1. 어떤 상품들은 매출원가가 17%보다 실제로 더 낮을 수 있다. 만약 17%가 낮다면, 83%를 제외한 나머지 금액은 어디로 가는가?
    1. 어떤 상품들은 모델명이 없다. 매출원가를 알거나 상품 정보를 알기 위한 정보가 투명하게 공개되어 있지 않다.
    2. 쿠쿠 음쓰처리기는 동클에 550으로 올라와 있다. 이것의 17%는 93.5만원이다. 그런데 쿠쿠 공홈에 가면 동클에서 파는 기종과 동일한 디자인을 가진 (모델명이 안 나와 있어 찾기 어렵다) 음쓰 처리기 새 상품 가격이 499,000~629,000원 사이에 올라와 있다. 그러면 나머지 금액 차액은 어디로 가는가?


# 코드 개선사항

1. Optimistic UI update for plan values without full reload. (main page?)
2. Add error boundary or toast system instead of alert().
3. Centralize id normalization in a small helper to DRY the mapping.
4. 메모 기능 추가

# 배포 개선사항

1. dev 환경과 production 환경 docker container 분리
2. CI/CD 파이프라인 구축 (예: GitHub Actions)
    - lint → unit/test → build → docker 이미지 생성 · 태깅 → 스테이징/프로덕션 배포 자동화
    - 실패 시 자동 롤백 또는 알림 설정
3. 환경별 설정 분리 및 비밀 관리
    - DEV/STAGING/PROD 환경 변수 분리(.env, Kubernetes Secret, GitHub Secrets 등)
    - 민감정보는 레포에 커밋하지 않음
4. Docker 이미지 최적화
    - 멀티스테이지 빌드로 이미지 크기 최소화
    - 캐시 계층 활용 및 불필요 파일 제외
5. 이미지 레지스트리와 태깅 전략
    - SemVer 또는 CI 빌드 번호 기반 태깅
    - immutable 태그 사용으로 재현 가능한 배포
6. 스테이징 환경과 E2E 테스트
    - 스테이징에서 자동화된 통합/엔드투엔드 테스트 실행
    - 수동/자동 승인 워크플로우 분리
7. 배포 전략 및 가용성 확보
    - 롤링/블루-그린 배포, 헬스체크와 준비 상태 검사 도입
    - 무중단 배포 고려
8. 모니터링·로그·알림
    - 애플리케이션 및 인프라 모니터링(예: Prometheus, Grafana)
    - 중앙화된 로그 수집(Splunk/ELK) 및 오류 추적(Sentry)
    - 운영 알림(슬랙/이메일) 설정
9. 보안 및 운영 강건성
    - 이미지 스캔, 취약점 점검, 최소 권한 원칙 적용
    - 리소스 제한(CPU/Memory), Liveness/Readiness 프로브 설정
10. 배포 문서화 및 Runbook
    - 배포 절차, 롤백 방법, 주요 연락처를 문서화
    - 복구 시나리오와 체크리스트 준비

# docker 명령어

## 완전 삭제 후 리셋

docker compose down -v --rmi local --remove-orphans

## 글로벌 클린업 (사용 시 주의)

docker container prune -f
docker image prune -f
docker volume prune -f

## 리빌드

docker compose build --no-cache

## 재시작

docker compose up -d

## DevContainer 사용한 1라이너

devcontainer up --workspace-folder . --remove-existing-container --build-no-cache

## 프론트엔드 개발 서버 부팅

docker compose exec frontend npm run dev -- --host 0.0.0.0 --port 5173

