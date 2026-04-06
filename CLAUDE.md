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
- Marketing site: `leaddrivecrm.org`
- CRM app: `app.leaddrivecrm.org` (port 3001 via PM2)
- App directory: `/opt/leaddrive-v2`
- PM2 process: `leaddrive-v2`

### Production Database
- IMPORTANT: use `-h localhost` with psql (peer auth fails without it)

### GitHub
- Repo: `rashadrahimov/leaddrive-v2`
- Branch: `main`

## Current State (April 6, 2026)

### What's DONE ✅
1. **Full scaffold**: 60+ pages, 50+ API routes, 41 Prisma models
2. **v1 data migration**: Script ready (`scripts/import-v1.ts`, 1052 lines, 29 data categories)
3. **All pages connected to real Prisma data**:
   - Dashboard, Companies, Contacts, Deals, Leads, Tasks
   - Contracts, Offers, Tickets, KB, Campaigns
   - Segments, Journeys, Inbox, Reports, AI Center
   - Settings: Currencies, Custom Fields, Workflows, SLA, Channels, Audit Log
   - Profitability (cost model analytics)
   - Finance: Invoices, A/P Bills, Bank Accounts, Payment Orders, Aging
4. **Full CRUD + Edit + Delete** on all entities:
   - Company, Contact, Deal, Lead, Ticket, Task — dialog modals with edit/create
   - `DeleteConfirmDialog` component on all pages
5. **Detail pages**: Company, Contact, Deal, Lead, Ticket, Task (with tabs, timelines, comments)
6. **Auth**: Login, Register, 2FA (TOTP setup/verify/disable), Forgot/Reset password
7. **Middleware**: Protects dashboard routes, injects orgId, role-based access, field-level permissions
8. **Deployment**: PM2 + Nginx on Hetzner, DNS configured, GitHub Actions auto-deploy on push
9. **i18n**: Full 3-language support (EN/RU/AZ) via next-intl on all pages
10. **AI Integration (Da Vinci)**:
    - 12 AI endpoints (chat, ticket suggestions, deal analysis, budget narrative, cost analysis)
    - Multi-agent orchestration with 3-tier fallback and agent routing
    - WhatsApp auto-reply with escalation, KB context, session management
    - Lead scoring, email analytics, financial observations
11. **WhatsApp Integration**:
    - Inbound/outbound messaging via Meta Cloud API
    - Auto-reopen closed tickets on customer reply (with phone fallback)
    - Da Vinci auto-reply with escalation guards
    - 24-hour messaging window detection + template fallback
12. **Tickets System**:
    - Full CRUD, status pipeline (new→open→in_progress→waiting→resolved→closed)
    - SLA tracking with live countdown, breach warnings
    - Auto-assignment (skill-based routing, least-loaded/round-robin)
    - Ticket macros (7 action types)
    - Kanban + list views, comments (public/internal), escalation
13. **Portal**: Customer self-service (auth, tickets, KB, Da Vinci chat, CSAT ratings)
14. **Finance Module**: Invoices, A/P, bank accounts, payment orders, aging analysis, multi-channel notifications
15. **Phase 4 Enterprise**: Field permissions, multi-agent AI, journey branching, VoIP (Twilio), landing pages

### What's NOT DONE YET ❌
1. **Production data import**: v2 DB on server needs import:
   ```bash
   ssh $SSH_USER@$SERVER "cd /opt/leaddrive-v2 && npx tsx scripts/import-v1.ts && npx tsx scripts/create-admin.ts"
   ```
2. **SSL**: Need to run `certbot --nginx -d leaddrivecrm.org -d app.leaddrivecrm.org`
3. **TypeScript strict mode**: `ignoreBuildErrors: true` in next.config.ts (workaround)

### Partially Done ⚠️
1. **Email campaigns**: SMTP configured, `sendEmail()` works, templates exist — but no compose UI for mass campaigns
2. **Portal**: Auth + tickets + KB structure works — chat and KB need full QA verification
3. **Ticket escalationLevel**: Field exists in schema + UI column, but value never incremented (always shows "—")
4. **Ticket detail inline edit**: Status/assignee/priority editable inline, but subject/description only via list page dialog

## Key Files
- `prisma/schema.prisma` — 41 models
- `src/lib/auth.ts` — NextAuth config with Prisma + bcrypt
- `src/lib/api-auth.ts` — getOrgId helper (header or session)
- `src/lib/prisma.ts` — Prisma singleton + tenantPrisma
- `src/lib/whatsapp.ts` — WhatsApp API client (send messages, templates)
- `src/lib/auto-assign.ts` — Skill-based ticket routing
- `src/lib/email.ts` — Email sending via nodemailer
- `src/middleware.ts` — Auth guard + org context injection
- `src/app/layout.tsx` — Root layout with SessionProvider
- `src/app/api/v1/webhooks/whatsapp/route.ts` — WhatsApp webhook + Da Vinci auto-reply
- `scripts/import-v1.ts` — Full v1→v2 data import (29 sections)
- `scripts/create-admin.ts` — Creates admin user with known password
- `scripts/deploy.sh` — Full deployment script (SSH → server)

## Deploy Commands

### Деплой — ОДНА КОМАНДА:
```bash
bash scripts/deploy.sh
```

Скрипт автоматически:
1. Проверяет билд локально (ловит ошибки ДО деплоя)
2. Пушит на GitHub
3. Пуллит на сервер
4. Билдит на сервере с `--webpack` (Turbopack не создаёт standalone)
5. Копирует static файлы в standalone
6. Рестартует PM2 + health check

### ВАЖНО: Deploy правила
- Сервер: `46.224.171.53`, SSH: `root@46.224.171.53`
- PM2 запускает `.next/standalone/server.js` через `/tmp/start-leaddrive.sh`
- Start script: `source .env → cd .next/standalone → node server.js`
- Next.js 16 Turbopack НЕ создаёт standalone → билд на сервере с `--webpack` флагом
- `output: "standalone"` в next.config.ts (webpack создаёт, turbopack нет)
- Если сервер не отвечает >30 секунд — СРАЗУ проси перезагрузить
- При schema changes: `npx prisma generate` + `npx prisma migrate deploy` на сервере

### Ручной деплой (если скрипт не работает):
```bash
git push origin main
ssh -i ~/.ssh/id_ed25519 root@46.224.171.53 "cd /opt/leaddrive-v2 && git pull origin main && npx prisma generate && npx next build --webpack && cp -r .next/static .next/standalone/leaddrive-v2/.next/static && pm2 restart leaddrive-v2"
```

### Проверка:
```bash
ssh -i ~/.ssh/id_ed25519 root@46.224.171.53 "pm2 status && curl -s -o /dev/null -w '%{http_code}' http://localhost:3001"
ssh -i ~/.ssh/id_ed25519 root@46.224.171.53 "pm2 logs leaddrive-v2 --lines 20 --nostream"
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
- Testing: User tests on app.leaddrivecrm.org
