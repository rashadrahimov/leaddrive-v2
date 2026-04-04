#!/bin/bash
# SLA Escalation Cron Script
# Add to crontab: */5 * * * * /opt/leaddrive-v2/scripts/cron-sla.sh >> /var/log/leaddrive-sla-cron.log 2>&1

# Load environment variables
if [ -f /opt/leaddrive-v2/.env ]; then
  export $(grep -E '^CRON_SECRET=' /opt/leaddrive-v2/.env | xargs)
fi

# Default to localhost:3001 (PM2 process)
APP_URL="${APP_URL:-http://localhost:3001}"
CRON_SECRET="${CRON_SECRET:-}"

if [ -z "$CRON_SECRET" ]; then
  echo "$(date): ERROR - CRON_SECRET not set"
  exit 1
fi

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${APP_URL}/api/cron/sla-escalation" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${CRON_SECRET}")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

echo "$(date): HTTP ${HTTP_CODE} — ${BODY}"

if [ "$HTTP_CODE" -ne 200 ]; then
  echo "$(date): ERROR - SLA escalation cron failed"
  exit 1
fi
