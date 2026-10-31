#!/usr/bin/env bash
# Corpus health check (corpus-flow §7).
#   bash corpus/lint.sh          check: frontmatter, links, page size, stale roots
#   bash corpus/lint.sh --index  regenerate the catalog block in corpus/index.md
# Exits non-zero on any failure so it can gate a commit.
set -u
cd "$(dirname "$0")" || exit 2
CORPUS="$(pwd)"
ROOT="$(cd .. && pwd)"
MAX_BODY=200
# Top-level paths the repo has abandoned. A wiki page that still names one is stale.
STALE_ROOTS=()

fail=0
err() { echo "lint: $*"; fail=1; }

body_lines() { # lines after the closing frontmatter fence
  awk 'BEGIN{n=0;f=0} NR==1&&/^---$/{f=1;next} f==1&&/^---$/{f=2;next} f!=1{n++} END{print n}' "$1"
}

if [ "${1:-}" = "--index" ]; then
  tmp="$(mktemp)"
  for p in wiki/*.md; do
    [ -f "$p" ] || continue
    s="$(awk '/^summary:/{sub(/^summary:[ ]*/,"");print;exit}' "$p")"
    echo "- [$(basename "$p" .md)]($p): $s" >> "$tmp"
  done
  awk -v cat="$tmp" '
    /<!-- catalog:start -->/ {print; while ((getline l < cat) > 0) print l; skip=1; next}
    /<!-- catalog:end -->/ {skip=0}
    !skip {print}' index.md > index.md.new && mv index.md.new index.md
  rm -f "$tmp"
  echo "lint: index.md catalog regenerated"
  exit 0
fi

# 1. Frontmatter on every wiki page
for p in wiki/*.md; do
  [ -f "$p" ] || continue
  head -1 "$p" | grep -q '^---$' || { err "$p: no frontmatter"; continue; }
  grep -q '^summary: .\+' "$p" || err "$p: missing summary:"
  grep -q '^updated: [0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}' "$p" || err "$p: missing or bad updated:"
  n="$(body_lines "$p")"
  [ "$n" -le "$MAX_BODY" ] || err "$p: $n body lines (max $MAX_BODY) — split it"
done

# 2. Relative links resolve (all corpus markdown)
while IFS= read -r f; do
  d="$(dirname "$f")"
  grep -oE '\]\([^)#[:space:]]+' "$f" | sed -E 's/^\]\(//' \
    | grep -vE '^(https?:|mailto:)' | while read -r l; do
        [ -e "$d/$l" ] || echo "lint: $f: broken link $l"
      done
done < <(find . -name '*.md' -not -path './briefs/done/*' -not -path './briefs/superseded/*') | tee /tmp/corpus-lint-links.$$
[ -s /tmp/corpus-lint-links.$$ ] && fail=1
rm -f /tmp/corpus-lint-links.$$

# 3. Wiki pages reachable from index.md
for p in wiki/*.md; do
  [ -f "$p" ] || continue
  grep -q "($p)" index.md || err "$p: not linked from index.md (run --index)"
done

# 4. Stale path roots
for r in "${STALE_ROOTS[@]}"; do
  grep -rln -- "$r" wiki 2>/dev/null | while read -r f; do echo "lint: $f names abandoned path $r"; done
done

[ "$fail" -eq 0 ] && echo "lint: ok" || echo "lint: FAILED"
exit "$fail"
