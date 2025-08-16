FROM node:22.11.0

# Set working directory to match the volume mount
WORKDIR /app/src/my-pwa-frontend

# Copy package files first for better caching
COPY package*.json ./
RUN npm ci

# Copy application code (this will be overridden by volume mount in development)
COPY . .

# Expose port
EXPOSE 5173

# Default command (can be overridden in docker-compose.yml)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]