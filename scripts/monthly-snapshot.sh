#!/bin/bash
# Monthly budget snapshot — run on 1st of each month at 02:00
# Saves cost model values as BudgetActual records for the PREVIOUS month
# Usage: crontab -e → 0 2 1 * * /opt/leaddrive-v2/scripts/monthly-snapshot.sh

set -e

BASE_URL="http://localhost:3001"
LOG="/var/log/leaddrive-snapshot.log"

# Calculate previous month (the month we're snapshotting)
PREV_MONTH=$(date -d "yesterday" +%Y-%m 2>/dev/null || date -v-1d +%Y-%m)

echo "$(date) — Starting monthly snapshot for $PREV_MONTH" >> "$LOG"

# 1. Create cost model snapshot
curl -s -X POST "$BASE_URL/api/cost-model/snapshot" \
  -H "Content-Type: application/json" \
  -H "x-organization-id: auto" \
  >> "$LOG" 2>&1

echo "" >> "$LOG"

# 2. Create budget actuals from snapshot (for previous month)
RESULT=$(curl -s -X POST "$BASE_URL/api/budgeting/snapshot-actuals" \
  -H "Content-Type: application/json" \
  -d "{\"month\": \"$PREV_MONTH\"}")

echo "$(date) — Snapshot actuals result: $RESULT" >> "$LOG"
echo "---" >> "$LOG"
