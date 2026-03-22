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

### Production Server (Hetzner VDS)
- IP: `178.156.249.177`
- SSH: `root@178.156.249.177` (SSH key auth from Mac)
- v1 (Python): runs on port 8000, domain `leaddrivecrm.org`
- v2 (Next.js): runs on port 3001 via PM2, domain `v2.leaddrivecrm.org`
- App directory: `/opt/leaddrive-v2`
- PM2 process: `leaddrive-v2`

### Production Database
- v1 DB: `hermes_crm` (user: hermes, pass: hermes, host: localhost)
- v2 DB: `leaddrive_v2` (user: hermes, pass: hermes, host: localhost)
- IMPORTANT: use `-h localhost` with psql (peer auth fails without it)

### Login Credentials
- `admin@leaddrive.com` / `admin123`
- `rashadrahimsoy@gmail.com` / `admin123`

### GitHub
- Repo: `rashadrahimov/leaddrive-v2`
- Branch: `main`

### Namecheap (DNS)
- Domain: `leaddrivecrm.org`
- DNS A records: @, www, mtm, v2 → 178.156.249.177

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
   ssh root@178.156.249.177 "cd /opt/leaddrive-v2 && npx tsx scripts/import-v1.ts && npx tsx scripts/create-admin.ts"
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

### ВАЖНО: Билд ТОЛЬКО локально!
Сервер имеет 512MB RAM — `npm run build` на нём зависает и убивает процесс.
**НИКОГДА не запускай `npm run build` на сервере!** Всегда билди локально и отправляй `.next` через rsync.

Если сервер не отвечает >30 секунд — СРАЗУ проси пользователя перезагрузить.
На сервере есть 2GB swap (`swapon --show`), но билд всё равно делать ТОЛЬКО локально.

```bash
# 1. Билд ЛОКАЛЬНО
cd ~/Documents/hermes_crm/leaddrive-v2
npm run build

# 2. Push код на GitHub
git push origin main

# 3. Синхронизировать код и билд на сервер
ssh root@178.156.249.177 "cd /opt/leaddrive-v2 && git pull origin main"
rsync -az --delete .next/ root@178.156.249.177:/opt/leaddrive-v2/.next/

# 4. Перезапустить PM2
ssh root@178.156.249.177 "pm2 restart leaddrive-v2"

# Check logs
ssh root@178.156.249.177 "pm2 logs leaddrive-v2 --lines 20"

# Check status
ssh root@178.156.249.177 "pm2 status && curl -s -o /dev/null -w '%{http_code}' http://localhost:3001"

# Проверить swap (на случай если слетел после ребута)
ssh root@178.156.249.177 "swapon --show"
# Если swap нет — создать:
# fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
# echo '/swapfile none swap sw 0 0' >> /etc/fstab
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
```
DATABASE_URL="postgresql://hermes:hermes@localhost:5432/leaddrive_v2"
NEXTAUTH_SECRET="leaddrive-v2-secret-change-me-in-production"
NEXTAUTH_URL="http://v2.leaddrivecrm.org"  # or http://localhost:3000 for dev
```

## Autonomous Execution Protocol
When given a task:
1. Check tasks.json for current state
2. Execute the task completely
3. Test with `npm run build` before deploying
4. Deploy: `git push && ssh deploy`
5. Log progress to progress.txt
6. Move to next task automatically

## User Preferences
- Language: Russian (for communication), English (for code/commits)
- Style: "не мухлюй!" — be thorough, don't skip anything
- Commits: Detailed messages with what was done
- Testing: User tests on v2.leaddrivecrm.org
