#!/usr/bin/env bash
# .ralph/summary.sh — morning review helper
cd "$(dirname "$0")/.." || exit 1

echo "# Ralph 야간 리포트 — $(date)"
echo
echo "## 현재 브랜치"
git branch --show-current
echo
echo "## 커밋 수 (지난 16시간)"
git log --oneline --since="16 hours ago" | wc -l
echo
echo "## 커밋 목록"
git log --oneline --since="16 hours ago"
echo
echo "## 변경 통계"
first_commit="$(git log --since='16 hours ago' --reverse --format=%H | head -1)"
if [ -n "$first_commit" ]; then
  git diff --stat "${first_commit}^..HEAD" 2>/dev/null
fi
echo
echo "## Stall 이벤트"
cat .ralph/JOURNAL/stalls.md 2>/dev/null || echo "(없음)"
echo
echo "## 최신 STATE"
cat .ralph/STATE.md
echo
echo "## 남은 BACKLOG"
cat .ralph/BACKLOG.md
echo
echo "## 최근 JOURNAL 3개"
ls -1t .ralph/JOURNAL/*.md 2>/dev/null | head -3 | while read -r f; do
  echo "### $f"
  cat "$f"
  echo
done
