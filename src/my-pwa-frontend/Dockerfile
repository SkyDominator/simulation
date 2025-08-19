FROM node:20-bullseye-slim

WORKDIR /app/src/my-pwa-frontend

# Install git for runtime clone / pulls
RUN apt-get update \
 && apt-get install -y --no-install-recommends git bash ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# Vite host config
ENV VITE_HOST=0.0.0.0

EXPOSE 5173

# Idle by default; compose will invoke explicit dev server script
CMD ["/bin/bash", "/entrypoints/frontend-entrypoint.sh"]