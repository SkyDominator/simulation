FROM node:20-bullseye-slim

WORKDIR /app/src/my-pwa-frontend

# Install dependencies first (cached) – only package.json and lock files
COPY package*.json ./
RUN npm ci --silent

# Copy the rest (bind mount overwrites during development)
COPY . .

ENV VITE_HOST=0.0.0.0
EXPOSE 5173

# Idle by default; compose will start the dev server explicitly when desired
CMD ["tail", "-f", "/dev/null"]