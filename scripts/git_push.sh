#!/usr/bin/env bash
# Usage: ./scripts/git_push.sh <remote-url> "<commit-message>"
# Example: ./scripts/git_push.sh git@github.com:you/Linkedin_extension.git "Update extension"
REMOTE_URL="$1"
MSG="${2:-Auto commit from local machine}"

if [ -z "$REMOTE_URL" ]; then
  echo "Error: remote URL required. Usage: $0 <remote-url> [commit-message]"
  exit 1
fi

set -e

git init 2>/dev/null || true
git add .
git commit -m "$MSG" || echo "No changes to commit"
git branch -M main 2>/dev/null || true
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE_URL"
git push -u origin main

echo "✅ Pushed to $REMOTE_URL"
