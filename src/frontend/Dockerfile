FROM node:20-bullseye-slim

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends git bash ca-certificates \
 && rm -rf /var/lib/apt/lists/*


ENV VITE_HOST=0.0.0.0
EXPOSE 5173

COPY entrypoints /entrypoints
RUN chmod +x /entrypoints/*.sh

# Source code is cloned at runtime into /app (see common-init.sh)

CMD ["/entrypoints/frontend-entrypoint.sh"]