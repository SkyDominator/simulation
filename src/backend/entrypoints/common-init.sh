#!/bin/bash
set -euo pipefail

REPO_URL="${REPO_URL:-}"
GIT_BRANCH="${GIT_BRANCH:-main}"
TARGET_DIR="/app"
LOCK_FILE="${TARGET_DIR}/.clone.lock"

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

with_lock() {
  if command -v flock >/dev/null 2>&1; then
    exec 9>"$LOCK_FILE"
    flock 9
    "$@"
    return
  fi
  while ! mkdir "${LOCK_FILE}.d" 2>/dev/null; do
    echo "[common-init] Waiting for clone lock..."
    sleep 1
  done
  trap 'rmdir "${LOCK_FILE}.d" || true' EXIT
  "$@"
}

do_clone_or_update() {
  if [ -d "${TARGET_DIR}/.git" ]; then
    echo "[common-init] Repo exists – updating (branch $GIT_BRANCH)";
    git -C "$TARGET_DIR" fetch --quiet origin "$GIT_BRANCH" || true
    git -C "$TARGET_DIR" reset --hard "origin/$GIT_BRANCH" || true
    return
  fi
  # If directory non-empty but not a git repo, clear it (backend authoritative)
  if [ -n "$(ls -A "$TARGET_DIR" 2>/dev/null)" ]; then
    echo "[common-init] Non-git content found in $TARGET_DIR; removing before clone.";
    find "$TARGET_DIR" -mindepth 1 -maxdepth 1 ! -name ".clone.lock" ! -name ".clone.lock.d" -exec rm -rf {} +
  fi
  echo "[common-init] Cloning repository (branch: $GIT_BRANCH)..."
  URL_TO_USE="${REPO_URL_AUTH:-$REPO_URL}"
  git clone --branch "$GIT_BRANCH" --depth 1 "$URL_TO_USE" "$TARGET_DIR" 2>&1 | sed 's/'"${PAT:-__NO_PAT__}"'/***MASKED***/g'
}

with_lock do_clone_or_update
