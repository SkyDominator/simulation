#!/bin/bash
set -euo pipefail

# Perform clone/update (common init handles clone/pull)
bash /entrypoints/common-init.sh

# Ensure virtual environment in PATH (already set via Dockerfile)
export PATH="/opt/venv/bin:$PATH"

REQ_FILE="/app/src/backend/requirements.txt"
if [ -f "$REQ_FILE" ]; then
  echo "[backend-entrypoint] Installing Python dependencies..."
  pip install --no-cache-dir -r "$REQ_FILE"
else
  echo "[backend-entrypoint] WARNING: requirements.txt not found at $REQ_FILE"
fi

cd /app/src/backend

# Launch FastAPI with auto-reload
exec uvicorn main:app --host 0.0.0.0 --port 8000 --reload
