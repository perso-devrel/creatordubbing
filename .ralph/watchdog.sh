#!/usr/bin/env bash
# .ralph/watchdog.sh — stall detector
set -u
RALPH_DIR="$(cd "$(dirname "$0")" && pwd)"
HEARTBEAT="$RALPH_DIR/heartbeat"
LOG="$RALPH_DIR/logs/watchdog.log"
THRESHOLD="${THRESHOLD:-1500}"

mkdir -p "$RALPH_DIR/logs"
echo "[$(date)] watchdog start (threshold=${THRESHOLD}s)" >> "$LOG"

while true; do
  if [ -f "$HEARTBEAT" ]; then
    now=$(date +%s)
    if stat -c %Y "$HEARTBEAT" >/dev/null 2>&1; then
      mtime=$(stat -c %Y "$HEARTBEAT")
    else
      mtime=$(stat -f %m "$HEARTBEAT")
    fi
    age=$(( now - mtime ))
    if (( age > THRESHOLD )); then
      echo "[$(date)] STALL detected (age=${age}s) — killing claude" >> "$LOG"
      pkill -f "claude -p" || true
      touch "$HEARTBEAT"
    fi
  fi
  sleep 60
done
