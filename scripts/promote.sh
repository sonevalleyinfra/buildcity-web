#!/usr/bin/env bash
# scripts/promote.sh <sha> [--dry-run]
# Fast-forward `production` to <sha> (ADR 0002 section 3). Office Manager only, after the owner says "ship".
# Refuses unless: <sha> is on main, `e2e-staging` succeeded on it, and production -> <sha> is a fast-forward.
# e2e-staging is read from Actions workflow runs (push to main, by workflow path), not check-runs: any workflow
# token with checks:write can create a check-run named e2e-staging, but it can't fake a push-triggered run.
# --dry-run runs every check and prints the push instead of running it.
# Env: PROMOTE_REPO (default sonevalleyinfra/buildcity-web), PROMOTE_REMOTE (default origin).
set -euo pipefail

REPO="${PROMOTE_REPO:-sonevalleyinfra/buildcity-web}"
REMOTE="${PROMOTE_REMOTE:-origin}"
DRY=0
SHA_IN=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY=1 ;;
    -*) echo "unknown flag: $a" >&2; exit 2 ;;
    *) [ -z "$SHA_IN" ] && SHA_IN="$a" || { echo "usage: promote.sh <sha> [--dry-run]" >&2; exit 2; } ;;
  esac
done
[ -n "$SHA_IN" ] || { echo "usage: promote.sh <sha> [--dry-run]" >&2; exit 2; }
[[ "$SHA_IN" =~ ^[0-9a-fA-F]{7,40}$ ]] || { echo "refused: '$SHA_IN' is not a commit SHA" >&2; exit 2; }

git fetch --quiet "$REMOTE" main production
SHA="$(git rev-parse --verify --quiet "$SHA_IN^{commit}")" || { echo "refused: $SHA_IN is not a known commit" >&2; exit 1; }
# a branch/tag named like hex would win over the commit prefix
if [[ "${SHA,,}" != "${SHA_IN,,}"* ]]; then
  echo "refused: $SHA_IN resolved to $SHA (a ref name?), pass the full 40-char SHA" >&2
  exit 1
fi

# 1. on main
if ! git merge-base --is-ancestor "$SHA" "$REMOTE/main"; then
  echo "refused: $SHA is not on $REMOTE/main" >&2
  exit 1
fi

# 2. green e2e-staging on that exact commit (latest push-to-main run of the workflow file; $SHA is validated hex)
RESULT="$(gh api "repos/$REPO/actions/runs?head_sha=$SHA&event=push&per_page=100" \
  --jq '[.workflow_runs[] | select(.path==".github/workflows/e2e-staging.yml" and .head_branch=="main" and .head_sha=="'"$SHA"'")] | sort_by(.run_started_at // .created_at) | last | if . == null then "none" else "\(.status)/\(.conclusion)" end')"
if [ "$RESULT" != "completed/success" ]; then
  echo "refused: e2e-staging run on $SHA is '$RESULT', need 'completed/success'" >&2
  exit 1
fi

# 3. fast-forward only
PROD="$(git rev-parse --verify --quiet "$REMOTE/production^{commit}")" || { echo "refused: $REMOTE/production does not exist" >&2; exit 1; }
if [ "$PROD" = "$SHA" ]; then
  echo "nothing to do: production is already at $SHA"
  exit 0
fi
if ! git merge-base --is-ancestor "$PROD" "$SHA"; then
  echo "refused: $SHA is not a fast-forward of $REMOTE/production ($PROD)" >&2
  exit 1
fi

CMD="git push $REMOTE $SHA:refs/heads/production"
if [ "$DRY" = 1 ]; then
  echo "dry-run, all checks passed. Would run:"
  echo "$CMD"
  exit 0
fi
echo "+ $CMD"
git push "$REMOTE" "$SHA:refs/heads/production"

cat <<TXT

Pushed. Read-only prod smoke (wait for the Coolify and Vercel deploys, then):
  curl -fsS https://api.buildcity.cloud/health
  curl -fsS https://www.buildcity.in/api/v1/env      # expect env=production db=production commit=$SHA
  curl -fsS https://api.buildcity.cloud/api/v1/env   # same
  curl -s -o /dev/null -w '%{http_code}\n' https://www.buildcity.in/   # expect 200
TXT
