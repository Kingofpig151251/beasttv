#!/bin/sh
# sloplint 全部前端檔。CSS 已於重構時外置（styles.css），
# 所以 index.html 會失去兩條「CSS 存在性」檢查（focus-visible／overflow-x），
# 這兩條改由 styles.css 負責；其餘規則照舊對 index.html 生效。
cd "$(git rev-parse --show-toplevel)"
SLOP=/opt/data/skills/hallmark/scripts/sloplint.mjs
fail=0

for f in styles.css edit.html credits.html; do
  [ -f "$f" ] || continue
  out=$(node "$SLOP" "$f" --scope app 2>&1)
  if ! printf '%s' "$out" | grep -q "sloplint: 0 FAIL"; then
    printf '%s\n' "$out" | grep "FAIL"
    echo "✗ sloplint FAIL：$f"
    fail=1
  fi
done

if [ -f index.html ]; then
  bad=$(node "$SLOP" index.html --scope app 2>&1 | grep "FAIL" | grep -v "^sloplint:" \
    | grep -v "no :focus-visible styling anywhere" \
    | grep -v "no overflow-x: clip on html and body" || true)
  if [ -n "$bad" ]; then
    printf '%s\n' "$bad"
    echo "✗ sloplint FAIL：index.html"
    fail=1
  fi
fi

[ "$fail" -eq 0 ] && echo "sloplint: 全部通過"
exit "$fail"
