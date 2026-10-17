#!/usr/bin/env bash
# bash scripts/promote.test.sh : promote.sh against a throwaway git remote and a stubbed `gh`.
# Never pushes anywhere but the temp bare repo.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
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

mkdir "$T/bin"
cat > "$T/bin/gh" <<'STUB'
#!/usr/bin/env bash
# stub: prints GH_CONCLUSION, as the --jq filter would
echo "${GH_CONCLUSION:-none}"
STUB
chmod +x "$T/bin/gh"
export PATH="$T/bin:$PATH"

fail=0
expect() { # name, want-exit, want-substring, cmd...
  local name="$1" want="$2" sub="$3"; shift 3
  out="$("$@" 2>&1)"; rc=$?
  if [ "$rc" -eq "$want" ] && [[ "$out" == *"$sub"* ]]; then echo "ok   $name"; else echo "FAIL $name (rc=$rc): $out"; fail=1; fi
}
P="$HERE/promote.sh"

GH_CONCLUSION=success expect "refuses sha not on main" 1 "is not on origin/main" "$P" "$S" --dry-run
GH_CONCLUSION=failure expect "refuses red e2e-staging" 1 "need 'success'" "$P" "$C" --dry-run
GH_CONCLUSION=none    expect "refuses missing e2e-staging" 1 "'none'" "$P" "$C" --dry-run
# non-fast-forward: move production off main's line
git push -q -f origin "$S:refs/heads/production"
GH_CONCLUSION=success expect "refuses non-fast-forward" 1 "not a fast-forward" "$P" "$C" --dry-run
git push -q -f origin "$A:refs/heads/production"
GH_CONCLUSION=success expect "dry-run prints the push" 0 "git push origin $C:refs/heads/production" "$P" "$C" --dry-run
expect "dry-run did not push" 0 "$A" git --git-dir="$T/origin.git" rev-parse refs/heads/production
GH_CONCLUSION=success expect "short sha resolves" 0 "$C:refs/heads/production" "$P" "${C:0:9}" --dry-run
expect "rejects junk sha" 2 "not a commit SHA" "$P" "main; rm -rf /" --dry-run
GH_CONCLUSION=success expect "real run pushes (temp remote)" 0 "expect env=production" "$P" "$C"
expect "production moved" 0 "$C" git --git-dir="$T/origin.git" rev-parse refs/heads/production
GH_CONCLUSION=success expect "already promoted" 0 "nothing to do" "$P" "$C"
exit $fail
