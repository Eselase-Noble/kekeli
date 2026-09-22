#!/usr/bin/env bash
# Universal heartbeat for a phone (Termux) or any always-on computer.
# Runs forever, pinging the server every 60s. When power/internet dies,
# the pings stop and the server alerts you.
#
# Usage:
#   SERVER=https://your-server.com API_KEY=your-key DEVICE_ID=home-phone \
#     ./heartbeat.sh
#
# On Android: install Termux, `pkg install curl`, then run this. To keep it
# alive, use Termux:Boot or `termux-wake-lock`.

SERVER="${SERVER:-http://localhost:3000}"
API_KEY="${API_KEY:-change-me}"
DEVICE_ID="${DEVICE_ID:-home-phone}"
LABEL="${LABEL:-Home phone}"
INTERVAL="${INTERVAL:-60}"

echo "Heartbeat -> $SERVER as '$DEVICE_ID' every ${INTERVAL}s"

while true; do
  # Include battery level on Termux if available (termux-api).
  BATTERY=""
  if command -v termux-battery-status >/dev/null 2>&1; then
    BATTERY=$(termux-battery-status 2>/dev/null | grep -o '"percentage": *[0-9]*' | grep -o '[0-9]*')
  fi

  curl -s -X POST "$SERVER/api/heartbeat" \
    -H "content-type: application/json" \
    -H "x-api-key: $API_KEY" \
    -d "{\"id\":\"$DEVICE_ID\",\"label\":\"$LABEL\"${BATTERY:+,\"battery\":$BATTERY}}" \
    >/dev/null && echo "$(date '+%H:%M:%S') ping ok" || echo "$(date '+%H:%M:%S') ping FAILED"

  sleep "$INTERVAL"
done
