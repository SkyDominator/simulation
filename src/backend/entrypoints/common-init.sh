#!/bin/bash
set -euo pipefail

REPO_URL="${REPO_URL:-}"
GIT_BRANCH="${GIT_BRANCH:-main}"
TARGET_DIR="/app"

if [ -z "$REPO_URL" ]; then
  echo "[common-init] ERROR: REPO_URL not set" >&2
  exit 1
fi

# Build authenticated URL if PAT file provided
if [ -n "${GITHUB_PAT_FILE:-}" ] && [ -f "${GITHUB_PAT_FILE:-}" ]; then
  PAT="$(tr -d '\r\n' < "${GITHUB_PAT_FILE}")"
  if [ -n "$PAT" ]; then
    REPO_URL_AUTH="$(echo "$REPO_URL" | sed -E "s#https://#https://${PAT}@#")"
  fi
fi

do_clone_or_update() {
  if [ -d "${TARGET_DIR}/.git" ]; then
    echo "[common-init] Repo exists – updating (branch: $GIT_BRANCH)"
    git -C "$TARGET_DIR" fetch --quiet origin "$GIT_BRANCH" || true
    git -C "$TARGET_DIR" reset --hard "origin/$GIT_BRANCH" || true
    return
  fi
  
  # If directory non-empty but not a git repo, clean it safely
  if [ -n "$(ls -A "$TARGET_DIR" 2>/dev/null)" ]; then
    echo "[common-init] Cleaning non-git contents from $TARGET_DIR"
    # Change to safe directory before cleaning
    cd /tmp
    # Clean the target directory contents but keep the directory itself
    find "$TARGET_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  fi
  
  echo "[common-init] Cloning repository (branch: $GIT_BRANCH)..."
  URL_TO_USE="${REPO_URL_AUTH:-$REPO_URL}"
  
  # Clone to temp directory first, then move contents
  TEMP_DIR=$(mktemp -d)
  git clone --branch "$GIT_BRANCH" --depth 1 "$URL_TO_USE" "$TEMP_DIR" 2>&1 | sed 's/'"${PAT:-__NO_PAT__}"'/***MASKED***/g'
  
  # Move contents from temp to target (preserving hidden files)
  shopt -s dotglob
  mv "$TEMP_DIR"/* "$TARGET_DIR"/ 2>/dev/null || true
  shopt -u dotglob
  
  # Clean up temp directory
  rmdir "$TEMP_DIR" || true
  
  echo "[common-init] Clone completed successfully"
}

do_clone_or_update