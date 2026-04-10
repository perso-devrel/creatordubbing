#!/usr/bin/env bash
# .ralph/run.sh — Ralph loop harness
set -u

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RALPH_DIR="$PROJECT_DIR/.ralph"
LOG_DIR="$RALPH_DIR/logs"
JOURNAL_DIR="$RALPH_DIR/JOURNAL"

MAX_ITERATIONS="${MAX_ITERATIONS:-200}"
STALL_TIMEOUT="${STALL_TIMEOUT:-1500}"
COOLDOWN="${COOLDOWN:-8}"
BRANCH_PREFIX="${BRANCH_PREFIX:-ralph}"

mkdir -p "$LOG_DIR" "$JOURNAL_DIR"
cd "$PROJECT_DIR" || exit 1

BRANCH="${BRANCH_PREFIX}/$(date +%Y%m%d-%H%M%S)"
git fetch --all --quiet || true

BASE_BRANCH="develop"
if ! git show-ref --verify --quiet "refs/heads/${BASE_BRANCH}"; then
  BASE_BRANCH="main"
fi
git checkout "$BASE_BRANCH" >/dev/null 2>&1 || true
git pull --ff-only >/dev/null 2>&1 || true
git checkout -B "$BRANCH" || { echo "branch create failed"; exit 1; }

echo "[$(date)] Ralph harness start on branch $BRANCH (base=$BASE_BRANCH)" | tee -a "$LOG_DIR/harness.log"

if [ ! -f "$RALPH_DIR/watchdog.pid" ]; then
  nohup "$RALPH_DIR/watchdog.sh" >/dev/null 2>&1 &
  echo $! > "$RALPH_DIR/watchdog.pid"
  echo "[$(date)] started watchdog pid=$(cat "$RALPH_DIR/watchdog.pid")" >> "$LOG_DIR/harness.log"
fi

iteration=0
while (( iteration < MAX_ITERATIONS )); do
  iteration=$((iteration + 1))
  ts="$(date +%Y%m%d-%H%M%S)"
  log_file="$LOG_DIR/loop-${ts}-iter${iteration}.log"

  touch "$RALPH_DIR/heartbeat"
  echo "=== iter $iteration @ $ts ===" | tee -a "$log_file"

  timeout --signal=SIGTERM "$STALL_TIMEOUT" \
    claude -p \
      --dangerously-skip-permissions \
      --output-format stream-json \
      --verbose \
      < "$RALPH_DIR/PROMPT.md" \
      >> "$log_file" 2>&1

  exit_code=$?

  if ! git diff --quiet || ! git diff --cached --quiet; then
    git add -A
    git commit -m "ralph: iter ${iteration} @ ${ts} (exit=${exit_code})" \
      --no-verify || true
  else
    echo "[iter $iteration] no changes" >> "$log_file"
  fi

  if [ "$exit_code" = "124" ] || [ "$exit_code" = "137" ]; then
    {
      echo "## iter ${iteration} @ ${ts}"
      echo "- exit=${exit_code} (timeout ${STALL_TIMEOUT}s)"
      echo "- log=${log_file}"
      echo ""
    } >> "$JOURNAL_DIR/stalls.md"
  fi

  sleep "$COOLDOWN"
done

echo "[$(date)] Ralph harness reached MAX_ITERATIONS=$MAX_ITERATIONS" \
  | tee -a "$LOG_DIR/harness.log"

if [ -f "$RALPH_DIR/watchdog.pid" ]; then
  kill "$(cat "$RALPH_DIR/watchdog.pid")" 2>/dev/null || true
  rm -f "$RALPH_DIR/watchdog.pid"
fi
