#!/usr/bin/env bash
# bash scripts/promote.test.sh : promote.sh against a throwaway git remote and a stubbed `gh`.
# Never pushes anywhere but the temp bare repo.
set -uo pipefail
command -v jq >/dev/null || { echo "FAIL promote.test.sh needs jq (the gh stub applies --jq filters with it)"; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
export T
export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

git init -q --bare "$T/origin.git"
git clone -q "$T/origin.git" "$T/w" 2>/dev/null
cd "$T/w"
git checkout -q -b main
c() { echo "$1" > f; git add f; git commit -q -m "$1"; git rev-parse HEAD; }
A=$(c a); B=$(c b); C=$(c c)
git push -q origin main
git push -q origin "$A:refs/heads/production"
git checkout -q -b side "$A"; S=$(c side)          # not on main
git checkout -q main
git checkout -q -b diverged "$A"; git push -q origin "$A:refs/heads/prodx" 2>/dev/null; git checkout -q main
git branch deadbeef0 "$C"                          # hex-looking ref name pointing at C

mkdir "$T/bin"
cat > "$T/bin/gh" <<'STUB'
#!/usr/bin/env bash
# stub: like `gh api <path> --jq <filter>`, serving GH_RUNS / GH_CHECKS through real jq
echo "$*" >> "$T/gh.log"
[ "${1:-}" = api ] || exit 1
shift
path="" filter="."
while [ $# -gt 0 ]; do
  case "$1" in
    --jq) filter="$2"; shift 2 ;;
    -*) shift ;;
    *) [ -z "$path" ] && path="$1"; shift ;;
  esac
done
runs="${GH_RUNS:-}"; [ -n "$runs" ] || runs='{"workflow_runs":[]}'
checks="${GH_CHECKS:-}"; [ -n "$checks" ] || checks='{"check_runs":[]}'
case "$path" in
  */actions/runs\?*) printf '%s' "$runs" | jq -r "$filter" ;;
  */check-runs*) printf '%s' "$checks" | jq -r "$filter" ;;
  *) exit 1 ;;
esac
STUB
chmod +x "$T/bin/gh"
export PATH="$T/bin:$PATH"

# run path branch sha status conclusion started_at -> one workflow_run object
run() { printf '{"path":"%s","head_branch":"%s","head_sha":"%s","status":"%s","conclusion":%s,"run_started_at":"%s","created_at":"%s"}' \
  "$1" "$2" "$3" "$4" "$([ "$5" = null ] && echo null || echo "\"$5\"")" "$6" "$6"; }
runs() { local IFS=,; echo "{\"workflow_runs\":[$*]}"; }
W=.github/workflows/e2e-staging.yml
OK="$(runs "$(run $W main "$C" completed success 2026-01-01T00:00:00Z)")"

fail=0
expect() { # name, want-exit, want-substring, cmd...
  local name="$1" want="$2" sub="$3"; shift 3
  out="$("$@" 2>&1)"; rc=$?
  if [ "$rc" -eq "$want" ] && [[ "$out" == *"$sub"* ]]; then echo "ok   $name"; else echo "FAIL $name (rc=$rc): $out"; fail=1; fi
}
P="$HERE/promote.sh"

GH_RUNS="$OK" expect "refuses sha not on main" 1 "is not on origin/main" "$P" "$S" --dry-run
GH_RUNS="$OK" expect "success run passes" 0 "git push origin $C:refs/heads/production" "$P" "$C" --dry-run
expect "query uses head_sha and push event" 0 "head_sha=$C&event=push" cat "$T/gh.log"
expect "refuses no runs" 1 "'none'" "$P" "$C" --dry-run
GH_CHECKS="{\"check_runs\":[{\"name\":\"e2e-staging\",\"app\":{\"slug\":\"github-actions\"},\"status\":\"completed\",\"conclusion\":\"success\",\"started_at\":\"2026-01-01T00:00:00Z\"}]}" \
  expect "refuses spoofed check-run" 1 "need 'completed/success'" "$P" "$C" --dry-run
GH_RUNS="$(runs "$(run $W main "$C" completed success 2026-01-01T00:00:00Z)" "$(run $W main "$C" completed failure 2026-01-02T00:00:00Z)")" \
  expect "refuses newer failure after success" 1 "'completed/failure'" "$P" "$C" --dry-run
GH_RUNS="$(runs "$(run $W main "$C" completed success 2026-01-02T00:00:00Z)" "$(run $W main "$C" completed failure 2026-01-01T00:00:00Z)")" \
  expect "newer success after failure passes" 0 "$C:refs/heads/production" "$P" "$C" --dry-run
GH_RUNS="$(runs "$(run $W main "$C" in_progress null 2026-01-01T00:00:00Z)")" \
  expect "refuses in_progress run" 1 "'in_progress/null'" "$P" "$C" --dry-run
GH_RUNS="$(runs "$(run $W feature "$C" completed success 2026-01-01T00:00:00Z)")" \
  expect "refuses run not on main" 1 "'none'" "$P" "$C" --dry-run
GH_RUNS="$(runs "$(run .github/workflows/ci.yml main "$C" completed success 2026-01-01T00:00:00Z)")" \
  expect "refuses other workflow path" 1 "'none'" "$P" "$C" --dry-run
GH_RUNS="$(runs "$(run $W main "$B" completed success 2026-01-01T00:00:00Z)")" \
  expect "refuses run for another sha" 1 "'none'" "$P" "$C" --dry-run
# non-fast-forward: move production off main's line
git push -q -f origin "$S:refs/heads/production"
GH_RUNS="$OK" expect "refuses non-fast-forward" 1 "not a fast-forward" "$P" "$C" --dry-run
git push -q -f origin "$A:refs/heads/production"
expect "dry-run did not push" 0 "$A" git --git-dir="$T/origin.git" rev-parse refs/heads/production
GH_RUNS="$OK" expect "refuses hex-named ref" 1 "pass the full 40-char SHA" "$P" deadbeef0 --dry-run
GH_RUNS="$OK" expect "short sha resolves" 0 "$C:refs/heads/production" "$P" "${C:0:9}" --dry-run
expect "rejects junk sha" 2 "not a commit SHA" "$P" "main; rm -rf /" --dry-run
GH_RUNS="$OK" expect "real run pushes (temp remote)" 0 "expect env=production" "$P" "$C"
expect "production moved" 0 "$C" git --git-dir="$T/origin.git" rev-parse refs/heads/production
GH_RUNS="$OK" expect "already promoted" 0 "nothing to do" "$P" "$C"
exit $fail
