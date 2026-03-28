#!/bin/bash
# ═══════════════════════════════════════════════════════════
# LeadDrive CRM v2 — Deploy to Production
# Just push to main — GitHub Actions does the rest
# Usage: bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}[1/3]${NC} Checking for changes..."

if git diff --quiet HEAD 2>/dev/null && git diff --cached --quiet 2>/dev/null; then
  echo -e "  ${YELLOW}No uncommitted changes.${NC}"
else
  echo -e "  ${RED}WARNING:${NC} You have uncommitted changes!"
  echo "  Commit them first: git add . && git commit -m 'your message'"
  exit 1
fi

echo -e "${YELLOW}[2/3]${NC} Pushing to GitHub..."
CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH":main 2>&1 | tail -3

echo -e "${YELLOW}[3/3]${NC} GitHub Actions will build & deploy automatically."
echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Push complete!${NC}"
echo -e "${GREEN}  GitHub Actions: https://github.com/rashadrahimov/leaddrive-v2/actions${NC}"
echo -e "${GREEN}  Production: https://v2.leaddrivecrm.org${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
