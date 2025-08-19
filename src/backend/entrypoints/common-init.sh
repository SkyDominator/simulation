#!/bin/bash
set -euo pipefail

REPO_URL="${REPO_URL:-}"
GIT_BRANCH="${GIT_BRANCH:-main}"
TARGET_DIR="/app"

if [ -z "$REPO_URL" ]; then
  echo "[common-init] ERROR: REPO_URL not set" >&2
  exit 1
fi

if [ ! -d "${TARGET_DIR}/.git" ]; then
  echo "[common-init] Cloning repository $REPO_URL (branch: $GIT_BRANCH) ..."
  git clone --branch "$GIT_BRANCH" --depth 1 "$REPO_URL" "$TARGET_DIR"
else
  echo "[common-init] Repository already present; fetching updates..."
  git -C "$TARGET_DIR" fetch origin "$GIT_BRANCH" || true
  git -C "$TARGET_DIR" merge --ff-only "origin/$GIT_BRANCH" || true
fi
