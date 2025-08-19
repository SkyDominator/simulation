#!/bin/bash
set -euo pipefail

bash /entrypoints/common-init.sh

FRONTEND_DIR="/app/src/my-pwa-frontend"
PKG_JSON="$FRONTEND_DIR/package.json"

if [ -f "$PKG_JSON" ]; then
  cd "$FRONTEND_DIR"
  if [ ! -d node_modules ]; then
    echo "[frontend-entrypoint] Installing npm dependencies (npm ci)..."
    npm ci --silent || npm install
  else
    echo "[frontend-entrypoint] node_modules present; skipping install"
  fi
  echo "[frontend-entrypoint] Starting Vite dev server..."
  exec npm run dev -- --host 0.0.0.0 --port 5173
else
  echo "[frontend-entrypoint] WARNING: package.json not found at $PKG_JSON"
  exec tail -f /dev/null
fi
