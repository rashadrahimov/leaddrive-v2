# LeadDrive CRM v2 — Project Context for Claude Code

## Quick Start
```bash
cd ~/Documents/hermes_crm/leaddrive-v2
```

## What This Project Is
LeadDrive CRM v2 — полный переписал v1 (Python/FastAPI) на Next.js 16 + TypeScript + Prisma + PostgreSQL.
SaaS multi-tenant CRM для IT-аутсорсинговых компаний. Владелец: Rashad Rahimov, Güvən Technology LLC, Баку, Азербайджан.

## Architecture
- **Frontend**: Next.js 16 (App Router) + Tailwind CSS + shadcn/ui components
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL (local dev + production)
- **Auth**: NextAuth.js v5 (Credentials provider, JWT sessions)
- **Multi-tenant**: organizationId on every table, middleware injects from JWT
- **Deployment**: Hetzner VDS, PM2, Nginx reverse proxy

## Servers & Credentials

> **All credentials are stored in `.env` files and memory — NOT in this file.**
> See `.env.example` for the required variables.

### Production Server (Hetzner VDS)
- v1 (Python): runs on port 8000, domain `leaddrivecrm.org`
- v2 (Next.js): runs on port 3001 via PM2, domain `v2.leaddrivecrm.org`
- App directory: `/opt/leaddrive-v2`
- PM2 process: `leaddrive-v2`

### Production Database
- IMPORTANT: use `-h localhost` with psql (peer auth fails without it)

### GitHub
- Repo: `rashadrahimov/leaddrive-v2`
- Branch: `main`

## Current State (March 19, 2026)

### What's DONE ✅
1. **Full scaffold**: 43 pages, 27 API routes, 41 Prisma models, 820-line schema
2. **v1 data migration**: 51 tables exported from v1 via SSH, imported into v2
   - 241 companies, 577 contacts, 12 deals, 17 leads, 20 tasks
   - 16 tickets, 27 KB articles, 33 email templates, 9 AI sessions
   - 2000 audit log entries, cost model data (overhead, employees, pricing)
3. **All pages connected to real Prisma data** (no more mocks):
   - Dashboard, Companies, Contacts, Deals, Leads, Tasks
   - Contracts, Offers, Tickets, KB, Campaigns
   - Segments, Journeys, Inbox, Reports, AI Center
   - Settings: Currencies, Custom Fields, Workflows, SLA, Channels, Audit Log
   - Profitability (cost model analytics)
4. **CRUD forms**: Company, Contact, Deal, Lead, Ticket, Task (dialog modals)
5. **Detail pages**: Company (with tabs), Contact (with company link)
6. **Auth**: Login (real DB), Register (creates org + user + defaults), SessionProvider
7. **Middleware**: Protects dashboard routes, injects orgId, role-based access
8. **Deployment**: PM2 + Nginx on Hetzner, DNS configured

### What's NOT DONE YET ❌
1. **Production data import**: v2 DB on server is EMPTY — need to run:
   ```bash
   ssh $SSH_USER@$SERVER "cd /opt/leaddrive-v2 && npx tsx scripts/import-v1.ts && npx tsx scripts/create-admin.ts"
   ```
2. **SSL**: Need to run `certbot --nginx -d v2.leaddrivecrm.org`
3. **2FA (TOTP)**: Setup/verify/disable flow (M0.5)
4. **Forgot password**: Email flow (M0.6)
5. **Edit forms**: Company edit works, but Contact/Deal/Lead/Ticket/Task need edit mode
6. **Delete functionality**: API routes have DELETE methods but no UI confirmation
7. **Pricing page**: Static mock, needs connection to cost model
8. **Email sending**: SMTP integration for campaigns, notifications
9. **AI integration**: Claude API calls for AI agents (base service exists in Python compute)
10. **Portal**: Customer self-service portal (separate layout exists)
11. **TypeScript strict mode**: `ignoreBuildErrors: true` in next.config.ts (workaround)

## Key Files
- `prisma/schema.prisma` — 41 models, 820 lines
- `src/lib/auth.ts` — NextAuth config with Prisma + bcrypt
- `src/lib/api-auth.ts` — getOrgId helper (header or session)
- `src/lib/prisma.ts` — Prisma singleton + tenantPrisma
- `src/middleware.ts` — Auth guard + org context injection
- `src/app/layout.tsx` — Root layout with SessionProvider
- `scripts/import-v1.ts` — Full v1→v2 data import (29 sections)
- `scripts/create-admin.ts` — Creates admin user with known password
- `scripts/deploy.sh` — Full deployment script (SSH → server)
- `scripts/export-v1-remote.sh` — Exports v1 data via SSH

## Deploy Commands

### ВАЖНО: Deploy правила — билд ТОЛЬКО локально!
- Сервер имеет 512MB RAM — **НИКОГДА не запускай `npm run build` на сервере!**
- Используется `output: "standalone"` в next.config.ts
- Билд на Mac, rsync standalone на сервер
- PM2 запускает `.next/standalone/leaddrive-v2/server.js` (не `next start`)
- Если сервер не отвечает >30 секунд — СРАЗУ проси перезагрузить

```bash
# 1. Билд ЛОКАЛЬНО
cd ~/Documents/hermes_crm/leaddrive-v2
npm run build

# 2. Push код
git push origin main

# 3. Pull код на сервер + rsync standalone билд
ssh $SSH_USER@$SERVER "cd /opt/leaddrive-v2 && git pull origin main"
rsync -az --delete .next/standalone/ $SSH_USER@$SERVER:/opt/leaddrive-v2/.next/standalone/
rsync -az --delete .next/static/ $SSH_USER@$SERVER:/opt/leaddrive-v2/.next/static/
ssh $SSH_USER@$SERVER "cp -r /opt/leaddrive-v2/.next/static /opt/leaddrive-v2/.next/standalone/leaddrive-v2/.next/static"

# 4. Перезапустить PM2
ssh $SSH_USER@$SERVER "pm2 restart leaddrive-v2"

# Check logs
ssh $SSH_USER@$SERVER "pm2 logs leaddrive-v2 --lines 20"

# Check status
ssh $SSH_USER@$SERVER "pm2 status && curl -s -o /dev/null -w '%{http_code}' http://localhost:3001"
```

## Dev Commands
```bash
# Local dev
npx next dev

# Prisma
npx prisma migrate dev --name <name>
npx prisma generate
npx prisma studio

# Import v1 data
npx tsx scripts/import-v1.ts
npx tsx scripts/create-admin.ts
```

## Environment Variables (.env)
See `.env.example` for the full list. Key variables:
```
DATABASE_URL=<postgresql connection string>
NEXTAUTH_SECRET=<strong random secret>
NEXTAUTH_URL=<app URL>
```

## Autonomous Execution Protocol
When given a task:
1. Check tasks.json for current state
2. Execute the task completely
3. Test with `npm run build` before deploying
4. Deploy: `git push && ssh deploy`
5. Log progress to progress.txt
6. Move to next task automatically

## КРИТИЧНО: Защита UI дизайна (ОБЯЗАТЕЛЬНО для ВСЕХ сессий!)
- **НИКОГДА** не удалять, перемещать или заменять UI компоненты/секции без ЯВНОГО подтверждения пользователя
- Перед изменением layout — прочитать `docs/budgeting-layout.md` (и аналогичные файлы для других страниц)
- Если изменение затрагивает удаление/перемещение элементов — СНАЧАЛА уведомить пользователя и получить подтверждение
- После деплоя — проверить на production через Chrome MCP что ВСЕ секции из документации на месте
- Причина: ранее при рефакторинге терялись компоненты (waterfall, bar charts, alerts) — пользователь обнаруживал баги после деплоя

## User Preferences
- Language: Russian (for communication), English (for code/commits)
- Style: "не мухлюй!" — be thorough, don't skip anything
- Commits: Detailed messages with what was done
- Testing: User tests on v2.leaddrivecrm.org
