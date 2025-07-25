# 사용할 Node 버전을 정확히 명시
FROM node:22.11.0

WORKDIR /workspaces/src/my-pwa-frontend

COPY src/my-pwa-frontend/package*.json ./

# 이미지 빌드 시 의존성을 설치
RUN npm ci

COPY src/my-pwa-frontend/ .

CMD ["npm", "run", "dev"]