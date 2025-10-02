# src/frontend/Dockerfile
# Stage 1: (optional) local build; if prebuilt dist is provided, this stage can be skipped.
FROM node:18-alpine AS builder
WORKDIR /app
COPY ./src/frontend/package*.json ./
RUN npm ci
COPY ./src/frontend .
RUN npm run build

# Stage 2: nginx serving
FROM nginx:stable-alpine
# If build artifact provided in repo at ./src/frontend/dist, copy that; else use builder output
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./config/nginx/frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]