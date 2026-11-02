#!/usr/bin/env bash
#
# Fail if anything that must stay private is tracked by git.
# Run this before the first push and before every public release:
#
#   ./scripts/check-public-repo.sh
set -euo pipefail

cd "$(dirname "$0")/.."

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "error: not a git repository" >&2
  exit 1
fi

failed=0

echo "==> Checking tracked files for signing material"
if git ls-files | grep -E '(^|/)(keystore\.properties|local\.properties)$|\.(jks|keystore)$'; then
  echo "error: signing material is tracked; remove it with 'git rm --cached'." >&2
  failed=1
fi

echo "==> Checking tracked files for obvious credentials"
# Only scan small text files; skip lockfiles and vendored assets.
if git grep -InE '(storePassword|keyPassword)=[A-Za-z0-9][^[:space:]]{5,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}' \
  -- ':!pnpm-lock.yaml' ':!*.map' ':!screenshots/*' ':!*.md' 2>/dev/null; then
  echo "error: possible secret found in tracked files." >&2
  failed=1
fi

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "==> OK: no signing material or obvious secrets are tracked."
