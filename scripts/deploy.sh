#!/bin/bash
# ═══════════════════════════════════════════════════════════
# LeadDrive CRM v2 — Deploy to Production
# Usage: bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════
set -e

SERVER="178.156.249.177"
APP_DIR="/opt/leaddrive-v2"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${YELLOW}[$1/4]${NC} $2"; }
ok()   { echo -e "  ${GREEN}OK${NC} $1"; }

# ─── Step 1: Check ───
step 1 "Pre-flight..."
if ! git diff --quiet HEAD 2>/dev/null; then
  echo -e "  ${RED}WARNING:${NC} Uncommitted changes! Commit first."
  exit 1
fi
ok "Clean working tree"

# ─── Step 2: Push ───
step 2 "Pushing to GitHub..."
git push origin main 2>&1 | tail -3
ok "Pushed"

# ─── Step 3: Build on server ───
step 3 "Building on server..."
ssh -o ConnectTimeout=10 root@$SERVER "cd $APP_DIR && git pull origin main && npx prisma generate 2>&1 | tail -2 && NODE_OPTIONS='--max-old-space-size=1536' ./node_modules/.bin/next build --webpack 2>&1 | tail -5 && cp -r .next/static .next/standalone/.next/static 2>/dev/null; cp -r .next/static .next/standalone/leaddrive-v2/.next/static 2>/dev/null"
ok "Built"

# ─── Step 4: Restart ───
step 4 "Restarting..."
ssh root@$SERVER "pm2 delete leaddrive-v2 2>/dev/null; pm2 start /tmp/start-leaddrive.sh --name leaddrive-v2 && sleep 3 && curl -sf http://localhost:3001 -o /dev/null && echo 'OK' || echo 'FAILED'"
ok "Done"

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployed! https://v2.leaddrivecrm.org${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
