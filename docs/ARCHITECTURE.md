# LeadDrive CRM v2 — Architecture

## What This Is

LeadDrive CRM v2 — полный переписал v1 (Python/FastAPI) на Next.js 16 + TypeScript + Prisma + PostgreSQL.
SaaS multi-tenant CRM для IT-аутсорсинговых компаний. Владелец: Rashad Rahimov, LeadDrive Inc., Warsaw, Poland.

## Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Prisma ORM
- **Database**: PostgreSQL (local dev + production)
- **Auth**: NextAuth.js v5 (Credentials provider, JWT sessions)
- **Multi-tenant**: `organizationId` on every table, middleware injects from JWT
- **Deployment**: Hetzner VDS, PM2, Nginx reverse proxy

## Key Files

> Usually graphify (`graphify-out/wiki/`) is the better first stop. This is a fallback list.

- `prisma/schema.prisma` — 41 models
- `src/lib/auth.ts` — NextAuth config with Prisma + bcrypt
- `src/lib/api-auth.ts` — `getOrgId` helper (header or session)
- `src/lib/prisma.ts` — Prisma singleton + `tenantPrisma`
- `src/lib/whatsapp.ts` — WhatsApp API client
- `src/lib/auto-assign.ts` — skill-based ticket routing
- `src/lib/email.ts` — email sending via nodemailer
- `src/middleware.ts` — auth guard + org context injection
- `src/app/layout.tsx` — root layout with SessionProvider
- `src/app/api/v1/webhooks/whatsapp/route.ts` — WhatsApp webhook + Da Vinci auto-reply
- `scripts/import-v1.ts` — v1→v2 data import (29 sections)
- `scripts/create-admin.ts` — creates admin user
- `scripts/deploy.sh` — full deployment script

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

## Testing

134 tests in 11 files (Vitest) — rate-limit, webhooks, auto-assign, workflow-engine.

## Environment Variables

See `.env.example` for the full list. Credentials live in `.env` files and memory, never in version control.
