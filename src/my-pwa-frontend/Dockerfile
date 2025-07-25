# src/my-pwa-frontend/Dockerfile

FROM node:22.11.0

WORKDIR /workspaces/src/my-pwa-frontend

# 프로젝트 루트부터의 전체 경로로 package.json 관련 파일을 복사
COPY src/my-pwa-frontend/package*.json ./
RUN npm ci

COPY src/my-pwa-frontend/ .

CMD ["npm", "run", "dev"]