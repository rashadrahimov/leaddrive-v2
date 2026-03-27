# Reconnaissance Deliverable: LeadDrive v2 CRM — Attack Surface Map

**Date:** 2026-03-27
**Target:** https://v2.leaddrivecrm.org
**Analyst:** Reconnaissance Analysis Agent
**Input:** `deliverables/code_analysis_deliverable.md` + Live browser exploration + Parallel source code analysis agents

---

## 0) HOW TO READ THIS

This reconnaissance report provides a comprehensive map of the application's attack surface, with special emphasis on authorization and privilege escalation opportunities for the Authorization Analysis Specialist.

**Key Sections for Authorization Analysis:**
- **Section 4 (API Endpoint Inventory):** Contains authorization details for each endpoint — focus on "Required Role" and "Object ID Parameters" columns to identify IDOR candidates. Note that most endpoints use `getOrgId()` only (no role check), meaning **all 5 roles can access them**.
- **Section 6.4 (Guards Directory):** Catalog of authorization controls — note that `auth:orgscoped` is the dominant guard (not role-based), meaning role-based controls are largely absent from API endpoints.
- **Section 7 (Role & Privilege Architecture):** Complete role hierarchy and privilege mapping — the RBAC matrix is defined in code but enforced on <1% of endpoints.
- **Section 8 (Authorization Vulnerability Candidates):** Pre-prioritized lists of endpoints for horizontal, vertical, and context-based authorization testing.

**How to Use the Network Mapping (Section 6):** The entity/flow mapping shows system boundaries and data sensitivity levels. Pay special attention to the `findUnique()` tenant isolation bypass — any endpoint backed by `findUnique()` skips organization scoping entirely.

**Priority Order for Testing:** Start with Section 8.2's Vertical escalation candidates (settings/users endpoints with no role checks), then Section 8.1's Horizontal candidates (IDOR via `findUnique()` bypass), finally Section 8.3's workflow bypass candidates.

---

## 1. Executive Summary

LeadDrive v2 is a **multi-tenant SaaS CRM/ERP platform** serving sales, marketing, support, and financial operations. The application is built on Next.js 16 with a PostgreSQL database, Redis cache, and an auxiliary Python FastAPI compute microservice. The UI is primarily in Russian (indicating a Russian/Azerbaijani market), with over 239 API route handlers covering contact management, deal pipelines, invoicing, budgeting, AI-powered workflows, campaign management, and a customer-facing portal.

**Primary user-facing components constituting the attack surface:**
1. **Main CRM Dashboard** — Authenticated multi-module SPA (contacts, deals, companies, invoices, campaigns, AI, etc.)
2. **Customer Portal** — Separate authentication flow for end-customers to view invoices, tickets, and KB articles
3. **Public Lead Capture** — Unauthenticated web-to-lead form
4. **Webhook Receivers** — WhatsApp, Facebook/Instagram, Telegram, VKontakte integrations
5. **Journey Processor** — Unauthenticated endpoint triggering automated email/SMS workflows
6. **Admin Settings** — SMTP, roles/permissions, user management, channel configs

**Critical architectural security gaps discovered:**
- Hardcoded bypass credentials (`admin@leaddrive.com` / `admin123`) in NextAuth config
- RBAC permission matrix defined but enforced on approximately 1% of API endpoints (only `src/app/api/v1/projects/route.ts` calls `requireAuth()`)
- Multi-tenant isolation gap: `findUnique()` queries bypass organization scoping
- No security headers (no CSP, HSTS, X-Frame-Options, etc.)
- No rate limiting on any endpoint
- SSRF via admin-configurable SMTP host/port and webhook URLs

---

## 2. Technology & Service Map

- **Frontend:** Next.js 16.1.7 (App Router), React 19.2.3, TypeScript 5, Zustand 5.0.12 (state), TanStack Query 5.91.0 (data fetching), Radix UI (components), next-intl 4.8.3 (i18n), Zod 4.3.6 (validation)
- **Backend:** Next.js API Routes (TypeScript), Prisma 6.19.2 ORM, bcryptjs 3.0.3, otplib 13.4.0 (TOTP), nodemailer 7.0.13, isomorphic-dompurify 3.5.1 (partial sanitization), jose (JWT for portal), Pino 10.3.1 (logging)
- **Secondary Service:** Python 3.12 / FastAPI compute microservice (port 8000, internal only — cost model, AI analytics)
- **Infrastructure:** Docker Compose deployment; PostgreSQL 16 (port 5432); Redis (port 6379, **no auth**); standalone Next.js (port 3000); no CDN config visible in repository
- **Authentication Library:** NextAuth v5.0.0-beta.30 (beta release)
- **External APIs:** Anthropic Claude API, WhatsApp Cloud API (graph.facebook.com/v21.0), Facebook/Instagram Graph API, Telegram Bot API, Twilio SMS

**Identified Subdomains:**
- `v2.leaddrivecrm.org` — Primary application (confirmed live)

**Open Ports & Services (from code/docker-compose analysis):**
- `:3000` — Next.js application (primary attack surface)
- `:5432` — PostgreSQL (Docker, bound to 0.0.0.0 in dev with credentials `leaddrive:leaddrive`)
- `:6379` — Redis (Docker, bound to 0.0.0.0, **no authentication**)
- `:8000` — FastAPI compute service (Docker internal, dev `--reload` mode)

---

## 3. Authentication & Session Management Flow

**Entry Points:**
- `/login` — Primary CRM login (email + password + optional TOTP)
- `/register` — New organization + admin user self-registration
- `/forgot-password` — Password reset token request
- `/reset-password?token=<hex>` — Password reset via token
- `/login/verify-2fa` — TOTP/backup-code challenge (post-login)
- `/login/setup-2fa` — Forced 2FA enrollment
- `/portal` — Customer portal entry (separate auth system)
- `/portal/set-password?token=<hex>` — Portal account activation

**Mechanism (Main Application):**
1. User submits email + password to `POST /api/auth/signin` (NextAuth handler)
2. NextAuth Credentials provider calls `authorize()` in `src/lib/auth.ts` (lines 23–109)
3. `User.findFirst({ email, isActive: true })` lookup with organization relation
4. bcrypt password verification (12 rounds)
5. If TOTP enabled and no code provided → returns `{ needs2fa: true }`, middleware enforces redirect to `/login/verify-2fa`
6. On success: `jwt()` callback adds `role`, `organizationId`, `plan`, `needs2fa`, `needsSetup2fa` claims
7. NextAuth sets encrypted JWT session cookie: `__Secure-authjs.session-token` (httpOnly, secure in prod, sameSite=lax)
8. Middleware (`src/middleware.ts`) injects `x-organization-id`, `x-user-id`, `x-user-role`, `x-locale` request headers on all subsequent requests
9. API routes call `getOrgId(req)` or `requireAuth(req, module, action)` to authenticate

**CRITICAL BACKDOOR:** `src/lib/auth.ts` lines 95–106 — if database is unreachable, credentials `admin@leaddrive.com` / `admin123` authenticate as admin with enterprise plan, bypassing 2FA entirely.

**Code Pointers:**
- `src/lib/auth.ts` — NextAuth config, authorize(), jwt/session callbacks
- `src/lib/api-auth.ts` — `getOrgId()`, `requireAuth()`, `getSession()`
- `src/middleware.ts` — Route protection, 2FA enforcement, header injection
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `src/app/api/v1/auth/` — Registration, forgot-password, reset-password, TOTP endpoints
- `src/lib/portal-auth.ts` — Portal JWT creation/validation

### 3.1 Role Assignment Process

- **Role Determination:** Roles are read from the `User.role` database column at login time and embedded into the NextAuth JWT token claims. No dynamic role lookup occurs per-request.
- **Default Role:** New admin users created at registration get `role: "admin"` (line 66 in `src/app/api/v1/auth/register/route.ts`). Additional users created by admins get the role specified at creation time, defaulting to `"viewer"`.
- **Role Upgrade Path:** Admins can modify user roles via `PUT /api/v1/users/[id]` — **critically, this endpoint has NO role validation**, meaning any authenticated user can upgrade their own or others' roles.
- **Code Implementation:** `src/lib/auth.ts` lines 77–88 (role from DB), lines 117–131 (JWT callback stores role claim)

### 3.2 Privilege Storage & Validation

- **Storage Location:** Roles stored in `User.role` column in PostgreSQL. At runtime, role is embedded in the NextAuth JWT token (encrypted, signed with `NEXTAUTH_SECRET`). Role is also injected into request headers as `x-user-role` by middleware.
- **Validation Points:** `src/lib/api-auth.ts` `requireAuth()` function (lines 62–91) checks `checkPermission(role, module, action)`. However, only `src/app/api/v1/projects/route.ts` actually uses `requireAuth()` — all other endpoints use `getOrgId()` which only verifies org membership, not role.
- **Cache/Session Persistence:** JWT sessions persist until NextAuth session expiry (default NextAuth v5 is 30 days). Roles are NOT re-fetched from DB per request — a role change in the database only takes effect when the user logs in again (or session is invalidated).
- **Code Pointers:** `src/lib/permissions.ts` (full RBAC matrix), `src/lib/api-auth.ts` (enforcement functions), `src/middleware.ts` (header injection)

### 3.3 Role Switching & Impersonation

- **Impersonation Features:** None discovered in the codebase.
- **Role Switching:** No sudo mode or temporary privilege elevation mechanism exists.
- **Audit Trail:** User management changes are logged to `AuditLog` via `logAudit()` in `src/lib/prisma.ts` (lines 73–85). However, role changes are not specifically flagged — they're captured as general user update events.
- **Code Implementation:** N/A — no impersonation features exist.

---

## 4. API Endpoint Inventory

**Network Surface Focus:** All endpoints below are accessible through the deployed web application at https://v2.leaddrivecrm.org. Excluded: local-only CLI scripts, build tools, Telegram bridge standalone process.

**IMPORTANT NOTE ON AUTH:** Most endpoints show `getOrgId` as the authorization mechanism. This means **only org membership is checked, not the user's role**. A `viewer` role user can perform `DELETE` operations on most endpoints because `getOrgId()` does not enforce RBAC. The RBAC matrix in `src/lib/permissions.ts` is defined but not enforced.

| Method | Endpoint Path | Required Role | Object ID Parameters | Authorization Mechanism | Description & Code Pointer |
|---|---|---|---|---|---|
| POST | `/api/auth/signin` | anon | None | None | NextAuth login. `src/app/api/auth/[...nextauth]/route.ts` |
| GET | `/api/auth/session` | anon | None | None | NextAuth session check. `src/app/api/auth/[...nextauth]/route.ts` |
| POST | `/api/v1/auth/register` | anon | None | None | New org+user registration. `src/app/api/v1/auth/register/route.ts` |
| POST | `/api/v1/auth/forgot-password` | anon | None | None | Password reset request. `src/app/api/v1/auth/forgot-password/route.ts` |
| POST | `/api/v1/auth/reset-password` | anon | None | None | Reset password with token. `src/app/api/v1/auth/reset-password/route.ts` |
| POST | `/api/v1/auth/verify-2fa` | anon (partial session) | None | None | Verify TOTP after login. `src/app/api/v1/auth/verify-2fa/route.ts` |
| GET/POST | `/api/v1/auth/2fa` | user | None | `getOrgId()` only | Enable/disable 2FA. `src/app/api/v1/auth/2fa/route.ts` |
| POST | `/api/v1/auth/totp/setup` | user | None | `getOrgId()` only | Generate TOTP secret+QR. `src/app/api/v1/auth/totp/setup/route.ts` |
| POST | `/api/v1/auth/totp/verify` | user | None | `getOrgId()` only | Enable TOTP after verification. `src/app/api/v1/auth/totp/verify/route.ts` |
| GET | `/api/v1/auth/totp/status` | user | None | `getOrgId()` only | Check 2FA status. `src/app/api/v1/auth/totp/status/route.ts` |
| POST | `/api/v1/auth/totp/disable` | user | None | `getOrgId()` only | Disable TOTP (requires password). `src/app/api/v1/auth/totp/disable/route.ts` |
| POST | `/api/v1/public/leads` | anon | None | None (CORS: *) | Web-to-lead form. `src/app/api/v1/public/leads/route.ts` |
| POST/DELETE | `/api/v1/public/portal-auth` | anon | None | None | Customer portal login/logout. `src/app/api/v1/public/portal-auth/route.ts` |
| POST | `/api/v1/public/portal-auth/register` | anon | None | None | Portal self-registration. `src/app/api/v1/public/portal-auth/register/route.ts` |
| GET/POST | `/api/v1/public/portal-auth/set-password` | anon (token) | None | Token-based | Set portal password. `src/app/api/v1/public/portal-auth/set-password/route.ts` |
| GET/POST | `/api/v1/public/portal-chat` | anon | None | None (AI chat) | Customer AI support chat. `src/app/api/v1/public/portal-chat/route.ts` |
| GET | `/api/v1/public/portal-kb` | anon | None | None | Public KB articles. `src/app/api/v1/public/portal-kb/route.ts` |
| GET/POST | `/api/v1/public/portal-tickets` | anon (portal-token) | None | `portal-token` cookie | Customer ticket list/create. `src/app/api/v1/public/portal-tickets/route.ts` |
| GET/PUT | `/api/v1/public/portal-tickets/[id]` | anon (portal-token) | id | `portal-token` cookie | Customer ticket detail. `src/app/api/v1/public/portal-tickets/[id]/route.ts` |
| POST | `/api/v1/public/events/[id]/register` | anon | id | None | Event registration. `src/app/api/v1/public/events/[id]/register/route.ts` |
| GET | `/api/v1/calendar/feed/[token]` | anon (token) | token | Calendar token in path | ICS calendar feed. `src/app/api/v1/calendar/feed/[token]/route.ts` |
| GET/POST | `/api/v1/webhooks/whatsapp` | anon | None | WHATSAPP_VERIFY_TOKEN | WhatsApp webhook. `src/app/api/v1/webhooks/whatsapp/route.ts` |
| GET/POST | `/api/v1/webhooks/facebook` | anon | None | FACEBOOK_VERIFY_TOKEN | Facebook/Instagram webhook. `src/app/api/v1/webhooks/facebook/route.ts` |
| POST | `/api/v1/webhooks/telegram` | anon | None | Bot token query param | Telegram webhook. `src/app/api/v1/webhooks/telegram/route.ts` |
| POST | `/api/v1/webhooks/vkontakte` | anon | None | VK token | VKontakte webhook. `src/app/api/v1/webhooks/vkontakte/route.ts` |
| POST | `/api/v1/journeys/process` | anon | None | **NONE** | **Unauthenticated** journey runner — triggers email/SMS. `src/app/api/v1/journeys/process/route.ts` |
| GET/POST | `/api/v1/contacts` | user (any role) | None | `getOrgId()` only | Contact list/create. `src/app/api/v1/contacts/route.ts` |
| GET/PUT/DELETE | `/api/v1/contacts/[id]` | user (any role) | id | `getOrgId()` + `findFirst` w/orgId | Contact detail. `src/app/api/v1/contacts/[id]/route.ts` |
| GET | `/api/v1/contacts/[id]/engagement` | user (any role) | id | `getOrgId()` only | Contact engagement data. `src/app/api/v1/contacts/[id]/engagement/route.ts` |
| POST | `/api/v1/contacts/bulk-delete` | user (any role) | ids (array) | `getOrgId()` only | Bulk delete contacts. `src/app/api/v1/contacts/bulk-delete/route.ts` |
| GET/POST | `/api/v1/companies` | user (any role) | None | `getOrgId()` only | Company list/create. `src/app/api/v1/companies/route.ts` |
| GET/PUT/DELETE | `/api/v1/companies/[id]` | user (any role) | id | `getOrgId()` only | Company detail. `src/app/api/v1/companies/[id]/route.ts` |
| GET | `/api/v1/companies/[id]/timeline` | user (any role) | id | `getOrgId()` only | Company timeline. `src/app/api/v1/companies/[id]/timeline/route.ts` |
| GET/POST | `/api/v1/deals` | user (any role) | None | `getOrgId()` only | Deal list/create. `src/app/api/v1/deals/route.ts` |
| GET/PUT/DELETE | `/api/v1/deals/[id]` | user (any role) | id | `getOrgId()` only | Deal detail. `src/app/api/v1/deals/[id]/route.ts` |
| GET/POST/DELETE | `/api/v1/deals/[id]/contact-roles` | user (any role) | id | `getOrgId()` only | Deal contacts. `src/app/api/v1/deals/[id]/contact-roles/route.ts` |
| GET/POST/DELETE | `/api/v1/deals/[id]/team` | user (any role) | id | `getOrgId()` only | Deal team members. |
| GET/POST/DELETE | `/api/v1/deals/[id]/products` | user (any role) | id | `getOrgId()` only | Deal products. |
| GET/POST | `/api/v1/deals/[id]/offers` | user (any role) | id | `getOrgId()` only | Deal offers. |
| GET/POST | `/api/v1/leads` | user (any role) | None | `getOrgId()` only | Lead list/create. `src/app/api/v1/leads/route.ts` |
| GET/PUT/DELETE | `/api/v1/leads/[id]` | user (any role) | id | `getOrgId()` only | Lead detail. `src/app/api/v1/leads/[id]/route.ts` |
| POST | `/api/v1/leads/[id]/convert` | user (any role) | id | `getOrgId()` only | Convert lead to contact. |
| GET/POST | `/api/v1/invoices` | user (any role) | None | `getOrgId()` only | Invoice list/create. `src/app/api/v1/invoices/route.ts` |
| GET/PUT/DELETE | `/api/v1/invoices/[id]` | user (any role) | id | `getOrgId()` only | Invoice detail. `src/app/api/v1/invoices/[id]/route.ts` |
| GET | `/api/v1/invoices/[id]/pdf` | user (any role) | id | `getOrgId()` only | PDF generation. |
| POST | `/api/v1/invoices/[id]/send` | user (any role) | id | `getOrgId()` only | Send invoice email. |
| GET/POST | `/api/v1/invoices/[id]/payments` | user (any role) | id | `getOrgId()` only | Payment records. |
| GET/PUT/DELETE | `/api/v1/invoices/[id]/payments/[paymentId]` | user (any role) | id, paymentId | `getOrgId()` + **findUnique** (no orgId) | Payment detail — **IDOR risk via findUnique**. |
| POST | `/api/v1/invoices/[id]/act` | user (any role) | id | `getOrgId()` only | Generate legal act document. `src/app/api/v1/invoices/[id]/act/route.ts` |
| GET/POST | `/api/v1/invoices/[id]/duplicate` | user (any role) | id | `getOrgId()` only | Duplicate invoice. |
| GET | `/api/v1/invoices/[id]/chain` | user (any role) | id | `getOrgId()` only | Invoice chain. |
| GET/POST | `/api/v1/recurring-invoices` | user (any role) | None | `getOrgId()` only | Recurring invoices. |
| GET/PUT/DELETE | `/api/v1/recurring-invoices/[id]` | user (any role) | id | `getOrgId()` only | Recurring invoice detail. |
| POST | `/api/v1/recurring-invoices/generate` | user (any role) | None | `getOrgId()` only | Batch invoice generation. |
| GET/POST | `/api/v1/offers` | user (any role) | None | `getOrgId()` only | Offer list/create. |
| GET/PUT/DELETE | `/api/v1/offers/[id]` | user (any role) | id | `getOrgId()` only | Offer detail. |
| POST | `/api/v1/offers/[id]/send` | user (any role) | id | `getOrgId()` only | Send offer email. `src/app/api/v1/offers/[id]/send/route.ts` |
| GET/POST | `/api/v1/tasks` | user (any role) | None | `getOrgId()` only | Task list/create. |
| GET/PUT/DELETE | `/api/v1/tasks/[id]` | user (any role) | id | `getOrgId()` only | Task detail. |
| GET | `/api/v1/tasks/calendar` | user (any role) | None | `getOrgId()` only | Calendar view of tasks. |
| GET/POST | `/api/v1/projects` | user (any role) | None | `requireAuth()` ✓ | Project list/create — **only endpoint with proper auth**. `src/app/api/v1/projects/route.ts` |
| GET/PUT/DELETE | `/api/v1/projects/[id]` | user (any role) | id | `requireAuth()` ✓ | Project detail. |
| GET/POST | `/api/v1/projects/[id]/members` | user (any role) | id | `requireAuth()` ✓ | Project members. |
| GET/POST | `/api/v1/projects/[id]/tasks` | user (any role) | id | `requireAuth()` ✓ | Project tasks. |
| GET/POST | `/api/v1/contracts` | user (any role) | None | `getOrgId()` only | Contract list/create. |
| GET/PUT/DELETE | `/api/v1/contracts/[id]` | user (any role) | id | `getOrgId()` only | Contract detail. |
| POST | `/api/v1/contracts/[id]/files` | user (any role) | id | `getOrgId()` only | File upload. `src/app/api/v1/contracts/[id]/files/route.ts` |
| GET/DELETE | `/api/v1/contracts/[id]/files/[fileId]` | user (any role) | id, fileId | `getOrgId()` only | File detail/download. |
| GET/POST | `/api/v1/tickets` | user (any role) | None | `getOrgId()` only | Ticket list/create. |
| GET/PUT/DELETE | `/api/v1/tickets/[id]` | user (any role) | id | `getOrgId()` only | Ticket detail. |
| GET/POST | `/api/v1/tickets/[id]/comments` | user (any role) | id | `getOrgId()` only | Ticket comments. |
| POST | `/api/v1/tickets/ai` | user (any role) | None | `getOrgId()` only | AI ticket analysis. |
| GET/POST | `/api/v1/campaigns` | user (any role) | None | `getOrgId()` only | Campaign list/create. |
| GET/PUT/DELETE | `/api/v1/campaigns/[id]` | user (any role) | id | `getOrgId()` only | Campaign detail. |
| POST | `/api/v1/campaigns/[id]/send` | user (any role) | id | `getOrgId()` only | Send mass email campaign. `src/app/api/v1/campaigns/[id]/send/route.ts` |
| GET/POST | `/api/v1/segments` | user (any role) | None | `getOrgId()` only | Segment list/create. |
| GET/PUT/DELETE | `/api/v1/segments/[id]` | user (any role) | id | `getOrgId()` only | Segment detail. |
| POST | `/api/v1/segments/preview` | user (any role) | None | `getOrgId()` only | Preview segment contacts. |
| GET/POST | `/api/v1/journeys` | user (any role) | None | `getOrgId()` only | Journey list/create. |
| GET/PUT/DELETE | `/api/v1/journeys/[id]` | user (any role) | id | `getOrgId()` only | Journey detail. |
| POST | `/api/v1/journeys/enroll` | user (any role) | None | `getOrgId()` only | Enroll contact in journey. |
| GET/POST | `/api/v1/kb` | user (any role) | None | `getOrgId()` only | KB article list/create. |
| GET/PUT/DELETE | `/api/v1/kb/[id]` | user (any role) | id | `getOrgId()` only | KB article detail. |
| GET/POST | `/api/v1/events` | user (any role) | None | `getOrgId()` only | Event list/create. |
| GET/PUT/DELETE | `/api/v1/events/[id]` | user (any role) | id | `getOrgId()` only | Event detail. |
| GET/POST | `/api/v1/events/[id]/participants` | user (any role) | id | `getOrgId()` only | Event participants. |
| GET | `/api/v1/inbox` | user (any role) | None | `getOrgId()` only | Inbox (messages). `src/app/api/v1/inbox/route.ts` |
| GET/POST | `/api/v1/inbox/conversations` | user (any role) | None | `getOrgId()` only | Conversation list/create. |
| GET/PUT | `/api/v1/inbox/conversations/[id]` | user (any role) | id | `getOrgId()` only | Conversation detail. |
| GET/POST | `/api/v1/inbox/conversations/[id]/messages` | user (any role) | id | `getOrgId()` only | Conversation messages. |
| GET | `/api/v1/email-log` | user (any role) | None | `getOrgId()` only | Email send history. |
| GET/POST | `/api/v1/email-templates` | user (any role) | None | `getOrgId()` only | Email template list/create. |
| GET/PUT/DELETE | `/api/v1/email-templates/[id]` | user (any role) | id | `getOrgId()` only | Email template detail. |
| POST | `/api/v1/whatsapp/send` | user (any role) | None | `getOrgId()` only | Send WhatsApp message. |
| POST | `/api/v1/whatsapp/test` | user (any role) | None | `getOrgId()` only | Test WhatsApp config. |
| POST | `/api/v1/ai/chat` | user (any role) | None | `getOrgId()` only | CRM AI assistant. `src/app/api/v1/ai/chat/route.ts` |
| POST | `/api/v1/ai/recommend` | user (any role) | None | `getOrgId()` only | AI recommendations. |
| GET | `/api/v1/ai` | user (any role) | None | `getOrgId()` only | AI status. |
| GET/POST | `/api/v1/ai-sessions` | user (any role) | None | `getOrgId()` only | AI session list/create. |
| GET/PUT/DELETE | `/api/v1/ai-sessions/[id]` | user (any role) | id | `getOrgId()` only | AI session detail. |
| GET/POST | `/api/v1/ai-configs` | user (any role) | None | `getOrgId()` only | AI config list/create. |
| GET/PUT/DELETE | `/api/v1/ai-configs/[id]` | user (any role) | id | `getOrgId()` only | AI config detail. |
| GET/POST | `/api/v1/ai-guardrails` | user (any role) | None | `getOrgId()` only | AI guardrails config. |
| GET | `/api/v1/ai-observations` | user (any role) | None | `getOrgId()` only | AI analytics observations. |
| GET/POST | `/api/v1/users` | user (any role) | None | `getOrgId()` only | User list/create. **No role check.** `src/app/api/v1/users/route.ts` |
| GET/PUT/DELETE | `/api/v1/users/[id]` | user (any role) | id | `getOrgId()` only | User detail. **No role check — any user can modify roles!** `src/app/api/v1/users/[id]/route.ts` |
| GET/POST | `/api/v1/settings/roles` | user (any role) | None | `getOrgId()` only | RBAC role config. **No admin check!** `src/app/api/v1/settings/roles/route.ts` |
| GET/PUT | `/api/v1/settings/permissions` | user (any role) | None | `getOrgId()` only | Permission matrix. **No admin check!** `src/app/api/v1/settings/permissions/route.ts` |
| GET/PUT | `/api/v1/settings/invoice` | user (any role) | None | `getOrgId()` only | Invoice settings. |
| GET/PUT | `/api/v1/settings/smtp` | user (any role) | None | `getOrgId()` only | SMTP config (SSRF vector). `src/app/api/v1/settings/smtp/route.ts` |
| POST | `/api/v1/settings/smtp/test` | user (any role) | None | `getOrgId()` only | Test SMTP config. |
| GET/POST | `/api/v1/channels` | user (any role) | None | `getOrgId()` only | Channel config list. Returns API tokens! `src/app/api/v1/channels/route.ts` |
| GET/PUT/DELETE | `/api/v1/channels/[id]` | user (any role) | id | `getOrgId()` only | Channel config detail. |
| GET | `/api/v1/dashboard` | user (any role) | None | `getOrgId()` only | Dashboard data. |
| GET | `/api/v1/dashboard/executive` | user (any role) | None | `getOrgId()` only | Executive dashboard. |
| GET | `/api/v1/audit-log` | user (any role) | None | `getOrgId()` only | Audit log viewer. |
| GET/POST | `/api/v1/currencies` | user (any role) | None | `getOrgId()` only | Currency list/create. |
| GET/POST | `/api/v1/custom-fields` | user (any role) | None | `getOrgId()` only | Custom field definitions. |
| GET/POST | `/api/v1/products` | user (any role) | None | `getOrgId()` only | Product catalog. |
| GET/POST | `/api/v1/pipeline-stages` | user (any role) | None | `getOrgId()` only | Pipeline stage config. |
| GET/POST | `/api/v1/sla-policies` | user (any role) | None | `getOrgId()` only | SLA policy config. |
| GET | `/api/v1/search` | user (any role) | None | `getOrgId()` only | Global search. |
| GET | `/api/v1/reports` | user (any role) | None | `getOrgId()` only | Reports. |
| GET/POST | `/api/v1/portal-users` | user (any role) | None | `getOrgId()` only | Portal user management. |
| GET | `/api/v1/notifications` | user (any role) | None | `getOrgId()` only | Notifications. |
| GET | `/api/v1/organization/plan` | user (any role) | None | `getOrgId()` only | Org plan info. |
| GET | `/api/budgeting/snapshot` | user (any role) | None | `getOrgId()` only | Budget snapshot — raw SQL query. `src/app/api/budgeting/snapshot/route.ts` |
| POST | `/api/budgeting/ai-narrative` | user (any role) | None | `getOrgId()` only | AI budget narrative. |
| GET | `/api/budgeting/export` | user (any role) | None | `getOrgId()` only | Budget data export. |
| POST | `/api/budgeting/import-csv` | user (any role) | None | `getOrgId()` only | Bulk budget import. |
| GET | `/api/cost-model/ai-analysis` | user (any role) | None | `getOrgId()` only | AI cost analysis. |
| POST | `/api/cost-model/seed-clients` | user (any role) | None | `getOrgId()` only | Seed test data — dev stub. |
| GET | `/api/v1/pricing/export` | user (any role) | None | `getOrgId()` only | Full pricing export. |
| GET/POST | `/api/v1/webhooks` | user (any role) | None | `getOrgId()` only | Webhook config (SSRF vector). |
| GET | `/api/health` | anon | None | None | Health check. |

---

## 5. Potential Input Vectors for Vulnerability Analysis

**Network Surface Focus:** Only input vectors accessible through the deployed web application's network interface.

### URL Parameters (Query Strings)
- `GET /api/v1/contacts?search=<string>` — `search` param used in `CONTAINS` DB query; no max length. `src/app/api/v1/contacts/route.ts`
- `GET /api/v1/deals?search=<string>&stage=<string>&companyId=<id>` — `search` unvalidated; `stage` used as direct filter. `src/app/api/v1/deals/route.ts`
- `GET /api/v1/companies?search=<string>&category=<string>` — `search` unvalidated. `src/app/api/v1/companies/route.ts`
- `GET /api/v1/leads?search=<string>&status=<string>&includeConverted=<bool>` — `search` no length; `status` not enum-validated. `src/app/api/v1/leads/route.ts`
- `GET /api/v1/invoices?search=<string>&status=<string>&dateFrom=<date>&dateTo=<date>` — `dateFrom`/`dateTo` parsed with `new Date()` without ISO validation. `src/app/api/v1/invoices/route.ts`
- `GET /api/v1/tickets?status=<string>` — `status` not enum-validated. `src/app/api/v1/tickets/route.ts`
- `GET /api/v1/calendar/feed/[token]` — `token` path param used to look up calendar feed via `findFirst`. `src/app/api/v1/calendar/feed/[token]/route.ts`
- `GET /api/budgeting/snapshot?planId=<id>&at=<timestamp>` — Both params reach `prisma.$queryRaw` template literal. `src/app/api/budgeting/snapshot/route.ts` lines 16–30
- `GET /api/v1/search?q=<string>` — Global search query string.
- `GET /api/v1/public/portal-chat?sessionId=<uuid>` — Portal chat session ID; no format validation.
- `GET /api/v1/public/portal-auth/set-password?token=<hex>` — Token used for contact lookup.
- `GET /api/v1/webhooks/facebook?hub.verify_token=<token>&hub.challenge=<string>&hub.mode=<string>` — Webhook challenge verification. `src/app/api/v1/webhooks/facebook/route.ts`
- `GET /api/v1/webhooks/whatsapp?hub.verify_token=<token>` — WhatsApp webhook verification.
- `GET /api/v1/webhooks/telegram?token=<botToken>` — Telegram bot token in URL (log exposure risk). `src/app/api/v1/webhooks/telegram/route.ts`

### POST Body Fields (JSON)

**Authentication:**
- `POST /api/v1/auth/register` → `{ name, companyName, email, password }` — `src/app/api/v1/auth/register/route.ts`
- `POST /api/v1/auth/forgot-password` → `{ email }` — `src/app/api/v1/auth/forgot-password/route.ts`
- `POST /api/v1/auth/reset-password` → `{ token, password }` — `src/app/api/v1/auth/reset-password/route.ts`
- `POST /api/v1/auth/verify-2fa` → `{ code }` (TOTP or backup code) — `src/app/api/v1/auth/verify-2fa/route.ts`

**CRM Core:**
- `POST /api/v1/contacts` → `{ fullName, email, phone, position, companyId, source, tags[] }` — `src/app/api/v1/contacts/route.ts`
- `PUT /api/v1/contacts/[id]` → `{ fullName, email, phone, phones[], position, companyId, source, tags[], isActive, portalAccessEnabled }` — `src/app/api/v1/contacts/[id]/route.ts`
- `POST /api/v1/companies` → `{ name, industry, website, phone, email, address, city, country, description, status, slaPolicyId }` — `src/app/api/v1/companies/route.ts`
- `POST /api/v1/deals` → `{ name, companyId, campaignId, stage, valueAmount, currency, probability, expectedClose, assignedTo, notes, tags[] }` — `src/app/api/v1/deals/route.ts`
- `PUT /api/v1/deals/[id]` → `{ name, lostReason, customerNeed, salesChannel, notes, tags[], ... }` — `src/app/api/v1/deals/[id]/route.ts`
- `POST /api/v1/leads` → `{ contactName, companyName, email, phone, source, status, priority, estimatedValue, notes }` — `src/app/api/v1/leads/route.ts`

**Financial:**
- `POST /api/v1/invoices` → `{ title, items[{name, description, quantity, unitPrice, discount, customFields}], notes, termsAndConditions, footerNote, signerName, signerTitle, customColumns[], recipientEmail, billingAddress, voen, contractNumber, ... }` — `src/app/api/v1/invoices/route.ts` — Many fields flow into HTML templates unescaped
- `POST /api/v1/invoices/[id]/send` → `{ recipientEmail?, subject?, message? }` — triggers email send
- `POST /api/v1/invoices/[id]/act` → generates HTML document; uses company data from DB — `src/app/api/v1/invoices/[id]/act/route.ts` line 120 (`companyLogoUrl` in `<img src>`)
- `POST /api/v1/offers/[id]/send` → `{ recipientEmail, subject, message }` — `message` rendered with `.replace(/\n/g, "<br>")` without HTML escaping. `src/app/api/v1/offers/[id]/send/route.ts`

**Settings (SSRF Vectors):**
- `PUT /api/v1/settings/smtp` → `{ smtpHost, smtpPort, smtpUser, smtpPass, smtpTls, fromEmail, fromName }` — `smtpHost`/`smtpPort` reach `nodemailer.createTransport()` directly. `src/app/api/v1/settings/smtp/route.ts`
- `POST /api/v1/settings/smtp/test` → triggers email send with current SMTP config — SSRF trigger
- `POST /api/v1/webhooks` (webhook config) → `{ url, events[] }` — `url` reaches `fetch(webhook.url)` directly. `src/lib/webhooks.ts` line 52

**AI Endpoints:**
- `POST /api/v1/ai/chat` → `{ message, context{}, history[], locale }` — No length validation; message passed to Claude API. `src/app/api/v1/ai/chat/route.ts`
- `POST /api/v1/public/portal-chat` → `{ message, sessionId }` — No length validation; message becomes AI prompt with user data interpolated. `src/app/api/v1/public/portal-chat/route.ts`
- `POST /api/budgeting/ai-narrative` → budget data → Claude API

**User/Settings Management:**
- `POST /api/v1/users` → `{ name, email, password, role }` — `role` field flows directly to DB; no caller role check. `src/app/api/v1/users/route.ts`
- `PUT /api/v1/users/[id]` → `{ name, email, role, department, require2fa, totpEnabled }` — `role` can be set to `"admin"` by any user. `src/app/api/v1/users/[id]/route.ts` line 68
- `POST /api/v1/settings/roles` → `{ name, displayName, permissions{} }` — Any user can create custom roles. `src/app/api/v1/settings/roles/route.ts`
- `PUT /api/v1/settings/permissions` → `{ permissions{} }` — Any user can rewrite permission matrix. `src/app/api/v1/settings/permissions/route.ts`

**Content (XSS Vectors):**
- `POST /api/v1/kb` → `{ title, content, category, isPublished }` — `content` is rich HTML, rendered via `dangerouslySetInnerHTML` without sanitization. `src/app/api/v1/kb/route.ts`
- `PUT /api/v1/kb/[id]` → `{ content }` — same KB content XSS path
- `POST /api/v1/email-templates` → `{ name, subject, htmlBody }` — `htmlBody` rendered in preview via `dangerouslySetInnerHTML`. `src/components/email-template-form.tsx` line 392

**Public Forms:**
- `POST /api/v1/public/leads` → `{ name, email, phone, company, message, source, org_slug }` — CORS `*`. `src/app/api/v1/public/leads/route.ts`
- `POST /api/v1/public/portal-auth` → `{ email, password }` — Portal login; no rate limiting
- `POST /api/v1/public/portal-auth/register` → `{ email }` — Portal registration
- `POST /api/v1/public/portal-auth/set-password` → `{ token, password, confirmPassword }` — min password 6 chars
- `POST /api/v1/public/events/[id]/register` → `{ name, email, phone, ... }` — Event registration; triggers email

**File Uploads:**
- `POST /api/v1/contracts/[id]/files` → multipart form `file` field — 10MB limit, MIME whitelist enforced, filename randomized. `src/app/api/v1/contracts/[id]/files/route.ts` lines 44–92

**Budgeting/Finance (CSV Import):**
- `POST /api/budgeting/import-csv` → CSV file upload — parsed and batch-imported to DB
- `POST /api/budgeting/sales-forecast/import` → import file

### HTTP Headers Consumed by the Application
- `x-organization-id` — Used by `getOrgId()` as fast path to skip session lookup (`src/lib/api-auth.ts` line 42). **If middleware is bypassed, an attacker can forge org context.**
- `x-user-id` — Injected by middleware; consumed in ticket comments (`src/app/api/v1/tickets/[id]/comments/route.ts`) — header-injected identity.
- `x-user-role` — Injected by middleware; consumed by API routes for role-based display.
- `x-locale` — Injected from `NEXT_LOCALE` cookie; used for i18n language selection.
- `X-Forwarded-For` — Read from request headers for IP address in portal auth audit logging (`src/app/api/v1/public/portal-auth/route.ts`).
- `Authorization: Bearer <token>` — Not used by main app (JWT in cookie), but present in FastAPI service.

### Cookie Values
- `__Secure-authjs.session-token` — Encrypted JWT (A256CBC-HS512, JWE); contains `role`, `organizationId`, `plan`, `needs2fa`. httpOnly, secure.
- `__Host-authjs.csrf-token` — CSRF protection cookie for NextAuth form submissions. httpOnly.
- `__Secure-authjs.callback-url` — Redirect URL after login. **Could be an open redirect vector if not validated.**
- `portal-token` — HS256 JWT for customer portal; contains `contactId`, `organizationId`. httpOnly, sameSite=lax, **no explicit `secure` flag set** (`src/app/api/v1/public/portal-auth/route.ts` line 70).
- `NEXT_LOCALE` — Language preference (not httpOnly); read as `x-locale` header by middleware.

---

## 6. Network & Interaction Map

### 6.1 Entities

| Title | Type | Zone | Tech | Data | Notes |
|---|---|---|---|---|---|
| UserBrowser | Identity | Internet | Chrome/Firefox/Safari | Public | External attacker or authenticated user |
| LeadDriveCRM | Service | App | Next.js 16/TypeScript | PII, Tokens, Secrets | Primary app server, port 3000 |
| PostgreSQL-DB | DataStore | Data | PostgreSQL 16 / Prisma | PII, Tokens, Secrets | All CRM data, sessions, credentials |
| Redis | DataStore | Data | Redis (no auth) | Tokens | Session cache; no authentication |
| ComputeService | Service | App | Python 3.12 / FastAPI | PII | Cost model calculations; dev --reload mode |
| AnthropicAPI | ThirdParty | ThirdParty | Claude API (HTTPS) | PII | AI chat, auto-reply, analytics |
| WhatsAppAPI | ThirdParty | ThirdParty | Meta Graph API v21 (HTTPS) | PII | WhatsApp messaging |
| FacebookAPI | ThirdParty | ThirdParty | Meta Graph API v20 (HTTPS) | Tokens | Facebook/Instagram messaging; **token in URL** |
| TelegramAPI | ThirdParty | ThirdParty | Bot API (HTTPS) | PII | Telegram messaging |
| TwilioAPI | ThirdParty | ThirdParty | Twilio REST API (HTTPS) | PII | SMS sending |
| SMTPServer | ThirdParty | ThirdParty | Admin-configured SMTP | Secrets | Email sending; **host/port admin-controllable** |
| PortalCustomer | Identity | Internet | Browser + portal-token cookie | PII | Customer portal users (separate auth) |
| WebhookTarget | ExternAsset | Internet | Admin-configured URL | PII | Outbound webhooks; **URL admin-controllable** |
| AttackerSMTP | ExternAsset | Internet | Arbitrary SMTP | Secrets | SSRF target via SMTP config |

### 6.2 Entity Metadata

| Title | Metadata Key: Value |
|---|---|
| LeadDriveCRM | Hosts: `https://v2.leaddrivecrm.org`; Endpoints: `/api/auth/*`, `/api/v1/*`, `/api/budgeting/*`, `/api/cost-model/*`, `/api/finance/*`; Auth: NextAuth JWT cookie (`__Secure-authjs.session-token`), portal-token cookie; Dependencies: PostgreSQL-DB, Redis, ComputeService, AnthropicAPI |
| PostgreSQL-DB | Engine: `PostgreSQL 16`; Exposure: Docker `0.0.0.0:5432` (dev); Credentials: `leaddrive:leaddrive` (hardcoded in docker-compose); ORM: Prisma 6.19.2; TenantIsolation: Partial (findUnique bypass) |
| Redis | Engine: Redis; Exposure: Docker `0.0.0.0:6379`; Auth: **None**; Use: Session caching |
| ComputeService | Hosts: `http://localhost:8000` (internal); Mode: `--reload` (dev); Auth: **None**; Exposed via: `src/lib/compute.ts` path concatenation |
| AnthropicAPI | URL: `https://api.anthropic.com`; Auth: Bearer token (`ANTHROPIC_API_KEY` env); Used in: AI chat, portal chat, observations, cost analysis |
| PortalCustomer | Cookie: `portal-token` (HS256 JWT, 7 days, httpOnly, lax, **no secure flag**); Secret: `NEXTAUTH_SECRET` or fallback `"portal-secret"`; Claims: contactId, organizationId, companyId |
| WebhookTarget | Config: stored in `Webhook.url`; Dispatch: `src/lib/webhooks.ts:52`; Validation: **NONE** on URL |
| SMTPServer | Config: stored in `Organization.settings.smtp`; Transport: `nodemailer`; TLS: `rejectUnauthorized: false`; Validation: **NONE** on host |

### 6.3 Flows (Connections)

| FROM → TO | Channel | Path/Port | Guards | Touches |
|---|---|---|---|---|
| UserBrowser → LeadDriveCRM | HTTPS | `:443 /login` | None | Public |
| UserBrowser → LeadDriveCRM | HTTPS | `:443 /api/v1/auth/register` | None | PII |
| UserBrowser → LeadDriveCRM | HTTPS | `:443 /api/v1/public/*` | None | PII |
| UserBrowser → LeadDriveCRM | HTTPS | `:443 /api/v1/journeys/process` | **None (unauthenticated)** | PII |
| UserBrowser → LeadDriveCRM | HTTPS | `:443 /api/v1/webhooks/*` | webhook-token | Public |
| UserBrowser → LeadDriveCRM | HTTPS | `:443 /api/v1/*` (most) | auth:orgscoped | PII |
| UserBrowser → LeadDriveCRM | HTTPS | `:443 /api/v1/users/[id]` (PUT role) | auth:orgscoped (NO role check) | PII |
| UserBrowser → LeadDriveCRM | HTTPS | `:443 /api/v1/settings/*` | auth:orgscoped (NO admin check) | Secrets |
| PortalCustomer → LeadDriveCRM | HTTPS | `:443 /api/v1/public/portal-auth` | None | PII |
| PortalCustomer → LeadDriveCRM | HTTPS | `:443 /api/v1/public/portal-*` | portal-token cookie | PII |
| LeadDriveCRM → PostgreSQL-DB | TCP | `:5432` | vpc-only (Docker) | PII, Tokens, Secrets |
| LeadDriveCRM → Redis | TCP | `:6379` | vpc-only (Docker), **no-auth** | Tokens |
| LeadDriveCRM → ComputeService | HTTP | `:8000` | vpc-only (Docker), **no-auth** | PII |
| LeadDriveCRM → AnthropicAPI | HTTPS | `:443 /v1/messages` | api-key:Bearer | PII |
| LeadDriveCRM → WhatsAppAPI | HTTPS | `:443 /v21.0/...` | auth:bearer | PII |
| LeadDriveCRM → FacebookAPI | HTTPS | `:443 /v20.0/...?access_token=XXX` | auth:**token-in-url** | Tokens |
| LeadDriveCRM → TelegramAPI | HTTPS | `:443 /bot{token}/...` | auth:token-in-path | PII |
| LeadDriveCRM → TwilioAPI | HTTPS | `:443 /2010-04-01/...` | auth:basic | PII |
| LeadDriveCRM → SMTPServer | SMTP | `:{smtpPort}` (admin-configured) | **no-validation** | Secrets, PII |
| LeadDriveCRM → WebhookTarget | HTTP/S | `:{any}` (admin-configured) | **no-validation** | PII |

### 6.4 Guards Directory

| Guard Name | Category | Statement |
|---|---|---|
| None | Auth | No authentication required. Route is fully public. |
| auth:orgscoped | Auth | Requires valid NextAuth session; extracts `organizationId` from session or `x-organization-id` header. **Does NOT enforce role-based permissions** — all 5 roles pass this check. Implemented by `getOrgId()` in `src/lib/api-auth.ts` |
| auth:rolechecked | Authorization | Requires valid session AND role/permission check via `requireAuth(req, module, action)`. **Only used in `src/app/api/v1/projects/route.ts`** |
| auth:admin-ui-only | Authorization | Admin-only protection exists at UI middleware level (`src/middleware.ts` lines 83–86) for `/settings/*` UI routes. **API routes at `/api/v1/settings/*` are NOT protected by this guard.** |
| portal-token | Auth | Requires valid `portal-token` JWT cookie (HS256, signed with `NEXTAUTH_SECRET` or fallback `"portal-secret"`). Verified in `src/lib/portal-auth.ts`. Scoped to a `contactId` + `organizationId`. |
| webhook-token | Auth | Verify token compared to environment variable (`WHATSAPP_VERIFY_TOKEN`, `FACEBOOK_VERIFY_TOKEN`). Both have hardcoded fallback defaults. |
| calendar-token | Auth | URL path `[token]` parameter compared against `calendarToken` in User table. Tokens never expire and cannot be revoked. |
| ownership:org | Authorization | Auto-injected `organizationId` filter in Prisma `findMany`/`findFirst`/`update`/`delete` operations. **Does NOT apply to `findUnique()` queries.** Implemented in `src/lib/prisma.ts` lines 35–71. |
| ownership:contact | ObjectOwnership | Portal endpoints verify `contactId` from JWT token against requested ticket's `contactId`. Partial — some portal endpoints may not check. |
| vpc-only | Network | Service only reachable within Docker bridge network. PostgreSQL, Redis, ComputeService are nominally internal but exposed on 0.0.0.0 in dev configuration. |
| no-validation | Network | Admin-configurable URL/host with no IP allowlist or private-IP blacklist. Applies to SMTP config and webhook URL dispatch. |
| needs2fa | Auth | Middleware enforces redirect to 2FA verification if `session.user.needs2fa === true`. Applied in `src/middleware.ts` lines 41–60. |
| plan:module | Authorization | Feature flag based on `Organization.plan`. Applied in middleware for UI routes only. `canAccessModule(plan, pathname)` function. |

---

## 7. Role & Privilege Architecture

### 7.1 Discovered Roles

| Role Name | Privilege Level | Scope/Domain | Code Implementation |
|---|---|---|---|
| anon | 0 | Global | No authentication required (public endpoints, webhook receivers) |
| portal_customer | 0.5 | Org-scoped | `portal-token` cookie; represents customer contacts. No CRM dashboard access. |
| viewer | 1 | Org-scoped | Defined with wildcard `read` only in `src/lib/permissions.ts` lines 88–97. **But API endpoints don't enforce this — viewer can write/delete.** |
| sales | 2 | Org-scoped | Read/write on CRM core; read-only on contracts/invoices; no profitability/budgeting. `src/lib/permissions.ts` lines 40–67 |
| support | 2 | Org-scoped | Read/write on tickets/KB/contacts; read-only on deals/invoices. `src/lib/permissions.ts` lines 68–87 |
| manager | 4 | Org-scoped | Read/write/delete/export on most modules; limited on settings/billing. `src/lib/permissions.ts` lines 14–39 |
| admin | 10 | Org-scoped | Wildcard `["read", "write", "delete", "export", "admin"]` on all modules. `src/lib/permissions.ts` lines 8–13 |

**CRITICAL NOTE:** Despite the above privilege levels being defined, **API enforcement is nearly absent**. The only enforced role distinction at the API level is:
1. `getOrgId()` — verifies org membership (all roles pass)
2. `requireAuth(req, module, action)` — only used in projects routes
3. Middleware UI redirect — blocks non-admins from `/settings/*` UI (not API)

### 7.2 Privilege Lattice

```
Privilege Ordering (→ means "can access resources of" — DEFINED, not enforced in API):
anon → (public endpoints only)
portal_customer → (portal-token endpoints only)
viewer → sales → manager → admin
viewer → support → manager → admin

Parallel Isolation (|| means "not ordered relative to each other"):
sales || support (both level 2, different module focus)

API Reality (what is actually enforced):
anon → portal_customer = viewer = sales = support = manager = admin
(all authenticated roles have identical API access — only org membership checked)

Role Escalation Path (CRITICAL):
Any authenticated user → PUT /api/v1/users/[id] with { role: "admin" } → admin
(src/app/api/v1/users/[id]/route.ts line 68: `if (parsed.data.role !== undefined) updateData.role = parsed.data.role`)
```

**Note:** No role switching, sudo mode, or impersonation features exist in the application.

### 7.3 Role Entry Points

| Role | Default Landing Page | Accessible Route Patterns | Authentication Method |
|---|---|---|---|
| anon | `/home` | `/home`, `/login`, `/register`, `/forgot-password`, `/portal`, `/events/[id]/register` | None |
| portal_customer | `/portal` | `/portal/*` | `portal-token` cookie (JWT, 7 days) |
| viewer | `/` (Dashboard) | All dashboard routes; all `/api/v1/*` (in practice — not enforced) | `__Secure-authjs.session-token` cookie |
| sales | `/` (Dashboard) | All dashboard routes; intended: CRM core only | `__Secure-authjs.session-token` cookie |
| support | `/` (Dashboard) | All dashboard routes; intended: tickets/KB only | `__Secure-authjs.session-token` cookie |
| manager | `/` (Dashboard) | All dashboard routes | `__Secure-authjs.session-token` cookie |
| admin | `/` (Dashboard) | All dashboard routes including `/settings/*` | `__Secure-authjs.session-token` cookie |

### 7.4 Role-to-Code Mapping

| Role | Middleware/Guards | Permission Checks | Storage Location |
|---|---|---|---|
| viewer | `getOrgId()` (org check only) | `checkPermission("viewer", module, "read")` — defined but not called by API routes | JWT claims `role` field + `User.role` in DB |
| sales | `getOrgId()` (org check only) | `checkPermission("sales", ...)` — defined but not called | JWT claims `role` field + `User.role` in DB |
| support | `getOrgId()` (org check only) | `checkPermission("support", ...)` — defined but not called | JWT claims `role` field + `User.role` in DB |
| manager | `getOrgId()` (org check only) | `checkPermission("manager", ...)` — defined but not called | JWT claims `role` field + `User.role` in DB |
| admin | `getOrgId()` (org check only) + UI middleware redirect for `/settings/*` | `checkPermission("admin", ...)` — wildcard, always true | JWT claims `role` field + `User.role` in DB |

---

## 8. Authorization Vulnerability Candidates

### 8.1 Horizontal Privilege Escalation Candidates

| Priority | Endpoint Pattern | Object ID Parameter | Data Type | Sensitivity |
|---|---|---|---|---|
| **High** | `/api/v1/invoices/[id]/payments/[paymentId]` | paymentId | financial | Uses `findUnique({where:{id}})` — no org filter. Cross-tenant payment access. `src/app/api/v1/invoices/[id]/payments/[paymentId]/route.ts` line 19 |
| **High** | `/api/v1/contacts/[id]` | id | PII | Uses `findFirst` with orgId — protected. But no role check means viewer can delete. |
| **High** | `/api/v1/users/[id]` | id | user_data, credentials | Any org user can read/modify any other org user, including their role and 2FA settings. `src/app/api/v1/users/[id]/route.ts` |
| **High** | `/api/v1/public/portal-tickets/[id]` | id | support_data | Portal ticket IDOR — any portal customer may access other customers' tickets if org isolation is weak. |
| **Medium** | `/api/v1/deals/[id]` | id | financial | No ownership check — any org user (incl. viewer) can modify deals. |
| **Medium** | `/api/v1/invoices/[id]` | id | financial | No ownership check — any org user can modify/delete invoices. |
| **Medium** | `/api/v1/contracts/[id]/files/[fileId]` | id, fileId | documents | No ownership check on file within contract. |
| **Medium** | `/api/v1/channels/[id]` | id | Tokens, Secrets | Returns plaintext API keys, bot tokens. Any org user can read channel secrets. `src/app/api/v1/channels/route.ts` |
| **Low** | `/api/v1/tasks/[id]` | id | user_data | No assignment check — any user can modify any task. |
| **Low** | `/api/v1/ai-sessions/[id]` | id | PII | AI conversation history accessible to any org member. |

### 8.2 Vertical Privilege Escalation Candidates

| Target Role | Endpoint Pattern | Functionality | Risk Level |
|---|---|---|---|
| admin | `PUT /api/v1/users/[id]` with `{ role: "admin" }` | **Direct role escalation** — any user can set their own role to admin. No role check on handler. `src/app/api/v1/users/[id]/route.ts` line 68 | **CRITICAL** |
| admin | `PUT /api/v1/settings/permissions` | Rewrite the entire RBAC permission matrix for all roles. Any authenticated user. `src/app/api/v1/settings/permissions/route.ts` | **CRITICAL** |
| admin | `POST /api/v1/settings/roles` | Create custom roles with arbitrary permissions. `src/app/api/v1/settings/roles/route.ts` | **CRITICAL** |
| admin | `PUT /api/v1/settings/smtp` | Configure SMTP server (SSRF). No admin check. `src/app/api/v1/settings/smtp/route.ts` | **HIGH** |
| admin | `POST /api/v1/users` | Create new users with `role: "admin"`. No role check on creator. `src/app/api/v1/users/route.ts` | **HIGH** |
| admin | `PUT /api/v1/users/[id]` with `{ totpEnabled: false, require2fa: false }` | Disable another user's 2FA. No role check. `src/app/api/v1/users/[id]/route.ts` lines 76–84 | **HIGH** |
| admin | `PUT /api/v1/settings/roles` | Modify existing roles' permissions. `src/app/api/v1/settings/roles/route.ts` | **HIGH** |
| admin | `GET /api/v1/channels` | Retrieve all channel API tokens/secrets (WhatsApp, Telegram, etc.) — no role check. | **HIGH** |
| admin | `GET /api/v1/audit-log` | View all org activity logs. No role check — viewer can access. | **MEDIUM** |
| (cross-tenant) | `GET /api/v1/invoices/[id]/payments/[paymentId]` | Access payments from other organizations via `findUnique()` without org filter | **HIGH** |

### 8.3 Context-Based Authorization Candidates

| Workflow | Endpoint | Expected Prior State | Bypass Potential |
|---|---|---|---|
| 2FA Enforcement | `/api/v1/auth/verify-2fa` | Login completed, `needs2fa=true` in session | Direct API call to verify 2FA for any userId without knowing the session state |
| Journey Enrollment | `POST /api/v1/journeys/process` | Should require auth + enrolled contacts | **Fully unauthenticated** — anyone can trigger journey processing to send bulk emails/SMS |
| Portal Registration | `POST /api/v1/public/portal-auth/set-password` | Verification token sent via email | Brute-force short token space; token not rate-limited |
| Password Reset | `POST /api/v1/auth/reset-password` | Reset token generated via forgot-password | Token is hex (64 chars) — secure, but no rate limiting on reset attempts |
| Invoice Workflow | `POST /api/v1/invoices/[id]/send` | Invoice exists and is finalized | Any user can send any draft invoice to any email address |
| Calendar Token | `GET /api/v1/calendar/feed/[token]` | Token issued to org user | Tokens never expire — perpetual access if token leaked |
| Campaign Send | `POST /api/v1/campaigns/[id]/send` | Campaign prepared with recipients | Any authenticated user can trigger mass email send to all org contacts |
| Recurring Invoice | `POST /api/v1/recurring-invoices/generate` | Should be triggered by scheduler | Any user can manually trigger batch invoice generation |
| Segment Preview | `POST /api/v1/segments/preview` | Segment defined | Can preview and enumerate contact data across segments |
| Journey Enroll | `POST /api/v1/journeys/enroll` | Contact exists | Any user can enroll any contact into any automated workflow |

---

## 9. Injection Sources

### SQL Injection

**Source #1 — Budgeting Snapshot Raw SQL**
- **File:** `src/app/api/budgeting/snapshot/route.ts`
- **Lines:** 16–32
- **User Input Variables:** `planId` (from `searchParams.get("planId")`), `at` (from `searchParams.get("at")`)
- **Dangerous Sink:** `prisma.$queryRaw` template literal
- **Data Flow:** `GET /api/budgeting/snapshot?planId=X&at=Y` → `planId = searchParams.get("planId")` → `atDate = at ? new Date(at) : new Date()` → `prisma.$queryRaw\`... WHERE "planId" = ${planId} AND ... AND "createdAt" <= ${atDate}\``
- **Assessment:** Prisma's tagged template literal parameterizes values correctly — **not injectable via standard SQL injection**. However, the `new Date(at)` construction could fail unexpectedly with malformed input (potential error-based information disclosure).
- **Network Accessible:** YES — authenticated endpoint

### Command Injection
- **None identified.** No `child_process`, `exec`, `spawn`, or shell commands found in network-accessible code paths.

### Path Traversal / LFI

**Source #2 — Legal File JSON Read (Static — Not Exploitable)**
- **File:** `src/app/api/v1/pricing/export/route.ts`
- **Lines:** 9, 58
- **Assessment:** Path is hardcoded (`path.join(process.cwd(), "public", "data", "company_legal_names.json")`). Not user-controlled. **Not exploitable.**

**Source #3 — Contract File Serving**
- **File:** `src/app/api/v1/contracts/[id]/files/route.ts`
- **Lines:** 71, 75
- **User Input:** Original filename from upload; however file is saved with randomized UUID name.
- **Assessment:** Filename randomized: `crypto.randomBytes(16).toString("hex") + ext`. **Not traversal-exploitable.** However, the `id` path parameter is used in the contract lookup — protected by org scope via `findFirst`.
- **Network Accessible:** YES

### Server-Side Template Injection (SSTI)

**Source #4 — Campaign Email Template Rendering**
- **File:** `src/lib/email.ts`
- **Lines:** 173–179 (`renderTemplate()` function)
- **User Input:** `campaign.htmlBody` (stored in DB), contact data (`contact.fullName`)
- **Dangerous Sink:** `rendered.replace(new RegExp(\`\\{\\{${key}\\}\\}\`, "g"), value)` — simple string substitution
- **Data Flow:** `POST /api/v1/campaigns/[id]/send` → load `campaign.htmlBody` from DB → `renderTemplate(htmlBody, { client_name: contact.fullName })` → send email via SMTP
- **Assessment:** Simple regex string replacement — **not a full SSTI** (no expression evaluation). However, if `contact.fullName` contains `{{` patterns, could result in recursive/unintended substitution in edge cases. Primary risk is stored XSS in email rendering.
- **Network Accessible:** YES — authenticated endpoint

**Source #5 — Invoice HTML Template Generation (Unescaped Interpolation)**
- **File:** `src/lib/invoice-html.ts`
- **Lines:** 148–149, 176–180, 199, 233–234, 241–242, 303, 308
- **User Input:** Company names, invoice item descriptions, signer names, custom messages — all from database (user-controlled CRM data)
- **Dangerous Sink:** Direct string interpolation into HTML template: `` `${companyName}` ``, `` `${item.description}` ``, `` `${customMessage}` `` etc.
- **Data Flow:** `GET /api/v1/invoices/[id]/pdf` or `POST /api/v1/invoices/[id]/act` → build invoice from DB data → `generateInvoiceHtml(invoice, org)` → HTML template string with unescaped user data → returned as HTML/PDF
- **Assessment:** **HTML injection / stored XSS** — user-controlled values injected into HTML without escaping. Not evaluated as code server-side, but rendered in browser as HTML, enabling XSS.
- **Network Accessible:** YES

### XSS / HTML Injection Sinks (Stored XSS)

**Sink #1 — Knowledge Base Article Content**
- **File:** `src/app/(dashboard)/knowledge-base/[id]/page.tsx` line 139
- `dangerouslySetInnerHTML={{ __html: article.content }}` — no sanitization
- **Input:** `POST /api/v1/kb` → `content` field (rich HTML) → stored in DB → rendered unescaped
- **Network Accessible:** YES — authenticated dashboard

**Sink #2 — Customer Portal KB Display**
- **File:** `src/app/portal/knowledge-base/page.tsx` line 81
- `dangerouslySetInnerHTML={{ __html: selectedArticle.content }}` — no sanitization
- **Input:** Same KB content flow as above — but rendered in **public-facing portal**
- **Network Accessible:** YES — public portal

**Sink #3 — Email Log Body Display**
- **File:** `src/app/(dashboard)/email-log/page.tsx` line 246
- `dangerouslySetInnerHTML={{ __html: log.body }}` — no sanitization
- **Input:** Email HTML body stored when campaigns/invoices are sent
- **Network Accessible:** YES — authenticated dashboard

**Sink #4 — Email Template Preview**
- **File:** `src/components/email-template-form.tsx` lines 81, 90, 134, 392–393
- `dangerouslySetInnerHTML={{ __html: form.htmlBody.replace(...) }}` and `editorRef.current.innerHTML = ...`
- **Input:** User-authored HTML template content
- **Network Accessible:** YES — authenticated dashboard

**Sink #5 — AI Observations (Custom Markdown Parser)**
- **File:** `src/components/profitability/ai-observations.tsx` line 162
- `dangerouslySetInnerHTML={{ __html: markdownToHtml(result.analysis) }}`
- Custom `markdownToHtml()` (lines 22–56) uses unsanitized string interpolation: `` html += `<h4>${trimmed.slice(4)}</h4>` ``
- **Input:** Claude AI API response (controllable via prompt injection)
- **Network Accessible:** YES — authenticated dashboard

**Sink #6 — Invoice Act Document (HTML Attribute Injection)**
- **File:** `src/app/api/v1/invoices/[id]/act/route.ts` lines 120–121
- `` `<img src="${companyLogoUrl}" alt="${companyName}" ...>` `` — `companyLogoUrl` can be `javascript:...` or data URI
- **Input:** Org settings `companyLogoUrl` field
- **Network Accessible:** YES — authenticated endpoint

### Deserialization
- **None identified** as high-risk. JSON.parse is used on DB data (not raw user input). `segment.conditions as any` casting (`src/app/api/v1/campaigns/[id]/send/route.ts` lines 49–50) is unsafe but only affects internal logic, not deserialization of user-supplied bytes.

### SSRF Sinks

**SSRF #1 — Webhook URL Dispatch (CRITICAL)**
- **File:** `src/lib/webhooks.ts` line 52
- **Sink:** `await fetch(webhook.url, { method: "POST", body: JSON.stringify(payload) })`
- **Input Path:** `POST /api/v1/webhooks` → admin stores arbitrary URL → any CRM event triggers dispatch
- **Control:** FULL URL control, no IP/protocol restriction
- **Network Accessible:** YES — any CRM event (contact/deal/lead updates) triggers webhook

**SSRF #2 — SMTP Host/Port (CRITICAL)**
- **File:** `src/lib/email.ts` lines 14–34, 54–55
- **Sink:** `nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, ... })`
- **Input Path:** `PUT /api/v1/settings/smtp` → stores arbitrary host/port → any email send uses it
- **Control:** FULL host and port control, `rejectUnauthorized: false` (TLS bypass)
- **Network Accessible:** YES — `POST /api/v1/settings/smtp/test` + any email send endpoint

**SSRF #3 — Compute Service Path Concatenation (HIGH)**
- **File:** `src/lib/compute.ts` line 7
- **Sink:** `` await fetch(`${COMPUTE_URL}${path}`, { method: "POST" }) ``
- **Input Path:** API route parameters appended to compute service base URL; no path validation
- **Control:** PARTIAL (path segment only)
- **Network Accessible:** YES — indirectly via cost model/AI endpoints
