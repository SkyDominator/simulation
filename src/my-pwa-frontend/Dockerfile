FROM node:20-bullseye-slim

# Set working directory to match the volume mount
WORKDIR /app/src/my-pwa-frontend

# Install dependencies into the image (node_modules directory is mounted to a named volume by docker-compose)
COPY package*.json ./
RUN npm ci --silent

# Copy application code (this will be overridden by volume mount in development)
COPY . .

ENV VITE_HOST=0.0.0.0
# Expose port
EXPOSE 5173

# Keep container alive but don't auto-run the dev server (docker-compose.yml overrides command)
CMD ["tail", "-f", "/dev/null"]