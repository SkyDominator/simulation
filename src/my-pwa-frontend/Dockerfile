# /my-project/frontend/Dockerfile

FROM node:22.11.0

# 컨테이너 안의 작업 폴더 설정
WORKDIR /app

# package.json을 먼저 복사해 node_modules를 캐싱 (빌드 속도 향상)
COPY package*.json ./

# 의존성 설치 (RUN npm install 대신 CI 사용)
RUN npm ci

# 프론트엔드 폴더의 모든 파일을 컨테이너로 복사
COPY . .

# Vite 개발 서버 실행 (Vite는 기본적으로 5173 포트를 사용)
CMD ["npm", "run", "dev"]