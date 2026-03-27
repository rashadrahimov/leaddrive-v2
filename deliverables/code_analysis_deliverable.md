# Penetration Test: Code Analysis Deliverable — LeadDrive v2 CRM

**Date:** 2026-03-27
**Target:** LeadDrive v2 — Next.js Multi-Tenant CRM Application
**Analyst:** Pre-Recon Code Analysis Agent

---

# Penetration Test Scope & Boundaries

**Primary Directive:** This analysis is strictly limited to the **network-accessible attack surface** of the LeadDrive v2 application.

### In-Scope: Network-Reachable Components
- All Next.js App Router pages served at the application's public URL
- All API routes under `/api/v1/*` and `/api/auth/*` (239+ route handlers)
- Public endpoints: lead capture, portal authentication, webhook receivers, calendar feeds
- Authenticated CRM endpoints: contacts, deals, invoices, budgeting, AI, workflows
- Admin settings endpoints: SMTP, roles, permissions, user management
- The FastAPI compute service accessible via internal Docker network (indirectly reachable via API proxy)
- Telegram bridge service (if exposed via webhook registration)

### Out-of-Scope: Locally Executable Only
- `scripts/` directory (30+ migration/seed scripts, CLI-only)
- `setup.sh` (local environment bootstrap)
- Database migration scripts in `prisma/migrations/`
- `cost_model_migration_data/` and `migration_data/` (data import CSVs)
- GitHub Actions CI/CD pipelines (`.github/workflows/`)
- Docker build processes and Dockerfiles (infrastructure, not runtime)
- `telegram-bridge/bot.js` (standalone Node.js bot process, not web-accessible)
- Design system documentation (`design-system/`)

---

## 1. Executive Summary

LeadDrive v2 is a multi-tenant CRM/ERP platform built on Next.js 16.1.7 with a PostgreSQL database, Redis cache, and a Python FastAPI compute microservice. The application presents a **large and complex attack surface** with 239+ API route handlers, multiple public-facing webhook receivers, a customer portal with independent authentication, AI-powered features using the Anthropic Claude API, and financial operations including invoicing and payment recording. The codebase implements role-based access control (RBAC) with 5 roles across 13+ modules and multi-tenant data isolation via Prisma middleware.

The most critical security concerns center on several architectural weaknesses: (1) **hardcoded development credentials** in the authentication provider that function as a backdoor (`admin@leaddrive.com`/`admin123`), bypassing 2FA entirely; (2) a **multi-tenant isolation gap** where `findUnique()` database queries do not enforce organization-scoped filtering, enabling cross-tenant data access; (3) **SSRF vectors** through admin-configurable SMTP host/port and webhook URLs with no private IP blacklisting; and (4) multiple **stored XSS sinks** where user-controlled HTML is rendered without sanitization in knowledge base articles, email templates, and invoice documents.

Additional high-severity findings include: secrets (API tokens, TOTP secrets, SMTP passwords) stored unencrypted in the database and returned in plaintext API responses; rate limiting defined but not enforced on any endpoint; an unauthenticated journey processor endpoint (`/api/v1/journeys/process`) that can trigger automated email/SMS workflows; and multiple webhook endpoints with default/fallback verification tokens. The application uses NextAuth v5 beta for authentication with JWT sessions, but lacks security headers (no CSP, HSTS, X-Frame-Options), has no CSRF protection beyond NextAuth defaults, and exposes Redis and PostgreSQL services without authentication in its Docker deployment.

---

## 2. Architecture & Technology Stack

### Framework & Language

LeadDrive v2 is built on **Next.js 16.1.7** with **React 19.2.3** and **TypeScript 5**, using the App Router architecture. The application uses server-side rendering (SSR) and server components, with API routes defined as `route.ts` files under `src/app/api/`. Key frontend dependencies include Zustand 5.0.12 for state management, TanStack React Query 5.91.0 for data fetching, Radix UI components for the UI layer, and next-intl 4.8.3 for internationalization. Input validation uses **Zod 4.3.6** for schema validation on API request bodies. A critical security misconfiguration exists in `next.config.ts` (line 8): `typescript: { ignoreBuildErrors: true }` — this suppresses TypeScript errors at build time, meaning type-safety guarantees that could catch data-handling bugs are silently bypassed in production builds.

The backend data layer uses **Prisma 6.19.2** as the ORM connected to **PostgreSQL 16**. The Prisma schema (`prisma/schema.prisma`, 2218 lines) defines a comprehensive multi-tenant data model covering CRM contacts/companies/deals, invoicing, budgeting, support tickets, knowledge base, AI sessions, channel integrations, and workflow automation. Authentication is handled by **NextAuth v5.0.0-beta.30** — notably a beta release with potential for undiscovered security issues. Password hashing uses **bcryptjs 3.0.3** with 12 rounds, and TOTP-based 2FA is implemented via **otplib 13.4.0**. HTML sanitization uses **isomorphic-dompurify 3.5.1**, though it is inconsistently applied.

### Architectural Pattern

The system follows a **hybrid monolith + microservice** pattern. The primary Next.js application handles all web serving, API routing, authentication, and business logic. A secondary **FastAPI compute service** (Python 3.12) handles cost model calculations and AI-powered analytics, communicating with the main app via internal HTTP calls over the Docker network. An optional **Telegram bridge** (`telegram-bridge/bot.js`) runs as a standalone Node.js process. All services share the PostgreSQL database.

**Trust Boundaries:**
| Boundary | Protocol | Security |
|----------|----------|----------|
| Internet → Next.js App | HTTPS (port 3000) | NextAuth session validation, middleware auth |
| Next.js → Compute Service | HTTP (unencrypted, port 8000) | No authentication, internal Docker network only |
| Next.js → PostgreSQL | TCP (port 5432) | Connection string credentials, no TLS |
| Next.js → Redis | TCP (port 6379) | No authentication whatsoever |
| Next.js → External APIs | HTTPS | Bearer tokens (WhatsApp, Anthropic), Basic Auth (Twilio) |

### Critical Security Components

The security architecture relies on four core components: (1) **NextAuth middleware** (`src/middleware.ts`) that gates all non-public routes behind session validation and enforces 2FA; (2) **API authentication helpers** (`src/lib/api-auth.ts`) that extract organization context from headers or sessions; (3) **RBAC permissions** (`src/lib/permissions.ts`) enforcing module+action authorization; and (4) **Prisma tenant middleware** (`src/lib/prisma.ts`) that auto-injects `organizationId` filtering. However, each of these has gaps documented in subsequent sections — the middleware passes context via request headers that could be spoofed if middleware is bypassed, the tenant middleware doesn't cover `findUnique()`, and rate limiting (`src/lib/rate-limit.ts`) is defined but never wired into any route handler.

---

## 3. Authentication & Authorization Deep Dive

### Authentication Mechanisms

The application uses **NextAuth v5.0.0-beta.30** configured in `src/lib/auth.ts` with a single **Credentials provider** (email + password). The route handler is at `src/app/api/auth/[...nextauth]/route.ts`. Session strategy is **JWT** (line 112: `session: { strategy: "jwt" }`). The JWT token carries claims including `id`, `role`, `organizationId`, `organizationName`, `plan`, `needs2fa`, and `needsSetup2fa`. Password authentication uses bcrypt comparison, and upon successful login, the system updates `lastLoginAt` and increments `loginCount`. Google OAuth client ID/secret are in `.env.example` but the OAuth provider is **not configured** in the auth code — only Credentials provider is active.

**CRITICAL BACKDOOR:** In `src/lib/auth.ts` (lines 95-106), a hardcoded fallback exists: if the database is unreachable, credentials `admin@leaddrive.com` / `admin123` authenticate as an admin user with enterprise plan access, **completely bypassing 2FA**. This is a development convenience that constitutes a severe production vulnerability.

**Authentication API Endpoints (Exhaustive List):**
| Endpoint | Method | Auth Required | Purpose |
|----------|--------|---------------|---------|
| `/api/auth/[...nextauth]` | GET, POST | No | NextAuth session management, login, logout, CSRF |
| `/api/v1/auth/register` | POST | No | New organization + admin user registration |
| `/api/v1/auth/forgot-password` | POST | No | Password reset token generation |
| `/api/v1/auth/reset-password` | POST | No | Password reset with token |
| `/api/v1/auth/verify-2fa` | POST | Partial (session with 2FA challenge) | Login 2FA verification |
| `/api/v1/auth/2fa` | POST | Yes | Enable/verify 2FA |
| `/api/v1/auth/totp/setup` | POST | Yes | Generate TOTP secret + QR code |
| `/api/v1/auth/totp/verify` | POST | Yes | Verify TOTP and enable 2FA |
| `/api/v1/auth/totp/disable` | POST | Yes | Disable 2FA (requires password) |
| `/api/v1/auth/totp/status` | GET | Yes | Check user's 2FA status |
| `/api/v1/public/portal-auth` | POST, DELETE | No | Customer portal login/logout |
| `/api/v1/public/portal-auth/register` | POST | No | Customer portal registration |
| `/api/v1/public/portal-auth/set-password` | POST | No (token-based) | Set initial portal password |

### Session Management & Token Security

**Main Application Sessions:** JWT-based via NextAuth. The session cookie is set by NextAuth with default settings. NextAuth v5 uses `httpOnly` and `secure` (in production) cookies by default, but no explicit cookie configuration was found in the codebase — the application relies entirely on NextAuth defaults.

**Customer Portal Sessions:** Configured explicitly in `src/lib/portal-auth.ts` and `src/app/api/v1/public/portal-auth/route.ts`:
- **Cookie name:** `portal-token`
- **HttpOnly:** `true` (line 70 in portal-auth/route.ts)
- **SameSite:** `"lax"` (line 70 in portal-auth/route.ts)
- **Secure:** Not explicitly set (missing — cookies may transmit over HTTP)
- **MaxAge:** `86400 * 7` (7 days)
- **Path:** `"/"`
- **JWT Algorithm:** HS256
- **Signing Secret:** `process.env.NEXTAUTH_SECRET || "portal-secret"` (line 12 in portal-auth.ts) — **hardcoded fallback is a vulnerability**

**Password Security:** Registration uses bcrypt with 12 rounds (`src/app/api/v1/auth/register/route.ts`, line 60). User password updates use 10 rounds (`src/app/api/v1/users/[id]/route.ts`, line 73) — inconsistent. Password minimum is 8 characters for main app, but only 6 characters for portal (`src/app/api/v1/public/portal-auth/set-password/route.ts`, line 31). No complexity requirements (uppercase, numbers, special characters) are enforced.

### Authorization Model & Bypass Scenarios

**RBAC Implementation** (`src/lib/permissions.ts`): Five roles — `admin`, `manager`, `sales`, `support`, `viewer` — with permissions across 13+ modules (companies, contacts, deals, leads, tasks, contracts, offers, invoices, campaigns, reports, profitability, ai, settings, users, audit). Actions are: `read`, `write`, `delete`, `export`, `admin`. Admin role has wildcard access. Permission checking is automated via `requireAuth()` in `src/lib/api-auth.ts`, which resolves the module from the URL path and the action from the HTTP method.

**Potential Bypass Scenarios:**
1. **Header Spoofing:** The middleware injects `x-organization-id`, `x-user-id`, `x-user-role` headers (middleware.ts, lines 63-82). If an attacker can bypass the middleware (e.g., via a misconfigured proxy), they can spoof these headers to impersonate any user/org.
2. **findUnique Tenant Escape:** `src/lib/prisma.ts` line 46-48 — `findUnique()` queries are NOT filtered by `organizationId`. Any endpoint using `findUnique()` with a user-supplied ID can access cross-tenant data.
3. **Admin Settings Route Protection:** Only enforced via client-side redirect in middleware (line 84-86) — the API endpoints themselves rely on `requireAuth()` with module checks, but the redirect can be bypassed by directly calling API endpoints.

### 2FA Implementation

TOTP-based 2FA using `otplib`. Setup generates a secret via `generateSecret()`, produces a QR code, and stores the secret in `User.totpSecret` (plaintext in database). Backup codes are 8 hex strings generated via `crypto.randomBytes(4)` (only 32 bits of entropy per code — relatively weak). 2FA is enforced at the middleware level: users with `needs2fa=true` are redirected to `/login/verify-2fa`. Backup codes are one-time use (removed from the JSON array after consumption). **TOTP secrets and backup codes are stored unencrypted in the database** — a database compromise fully defeats 2FA.

### SSO/OAuth/OIDC Flows

Google OAuth credentials are referenced in `.env.example` but **no OAuth provider is configured** in the NextAuth setup (`src/lib/auth.ts`). There are no callback endpoints, no `state` or `nonce` parameter validation, and no OIDC discovery. The only authentication flow is email/password credentials with optional TOTP 2FA.

---

## 4. Data Security & Storage

### Database Security

The application uses **PostgreSQL 16** with **Prisma 6.19.2** ORM. The database schema (`prisma/schema.prisma`, 2218 lines) defines a comprehensive multi-tenant model. All major entities include an `organizationId` foreign key for tenant scoping. Multi-tenant isolation is enforced via a Prisma `$extends()` middleware in `src/lib/prisma.ts` (lines 35-71) that automatically injects `organizationId` into `findMany`, `findFirst`, `create`, `update`, `delete`, and `count` operations. **However, `findUnique()` queries are explicitly excluded from tenant filtering** (lines 46-48), creating a critical cross-tenant data access vulnerability. Any API endpoint that uses `findUnique()` with a user-supplied ID (e.g., `/api/v1/contacts/[id]`, `/api/v1/deals/[id]`) can potentially access records from other organizations.

A single raw SQL query exists in `src/app/api/budgeting/snapshot/route.ts` (lines 24-32) using `prisma.$queryRaw` with template literal parameterization — Prisma properly parameterizes this, so SQL injection risk is low. However, the query filters by `planId` and `organizationId` separately, meaning a valid `orgId` combined with a `planId` from another org could yield unexpected results if the logical validation is insufficient.

**Sensitive fields stored without encryption at rest:**

| Field | Model | Storage | Risk |
|-------|-------|---------|------|
| `totpSecret` | User | Plaintext string | 2FA bypass if DB compromised |
| `backupCodes` | User | Plaintext JSON array | 2FA bypass |
| `botToken` | ChannelConfig | Plaintext string | WhatsApp/Telegram account takeover |
| `apiKey` | ChannelConfig | Plaintext string | API credential theft |
| `appSecret` | ChannelConfig | Plaintext string | Integration compromise |
| `settings.smtp.smtpPass` | Organization (JSON) | Plaintext in JSON field | SMTP credential theft |
| `secret` | Webhook | Plaintext string | Webhook signature forgery |
| `resetToken` | User | Plaintext hex string | Account takeover |
| `portalVerificationToken` | Contact | Plaintext string | Portal account takeover |

Password hashes (`passwordHash` on User, `portalPasswordHash` on Contact) are properly stored as bcrypt hashes.

### Data Flow Security

**Critical Data Exposure in API Responses:**
1. **Channel configs returned with secrets:** `src/app/api/v1/channels/route.ts` (lines 25-30) returns full `ChannelConfig` records including `botToken`, `apiKey`, and `appSecret` in plaintext to any authenticated user. No `select()` clause filters sensitive fields.
2. **TOTP secret returned during setup:** `src/app/api/v1/auth/totp/setup/route.ts` (lines 37-44) returns the raw TOTP secret in the API response alongside the QR code.
3. **Backup codes returned after 2FA enable:** `src/app/api/v1/auth/totp/verify/route.ts` (lines 51-54) returns all 8 backup codes in the response.
4. **Email enumeration:** `src/app/api/v1/auth/register/route.ts` (line 29) returns "Email already registered" (409 status), enabling email enumeration. The forgot-password endpoint correctly prevents this by always returning success.

**Audit Logging:** The `logAudit()` function (`src/lib/prisma.ts`, lines 73-85) stores `oldValue` and `newValue` JSON without redacting PII or sensitive data. Contact updates (e.g., `src/app/api/v1/contacts/[id]/route.ts`, line 52) log the entire parsed request body including all PII fields.

### Multi-Tenant Data Isolation

The Prisma tenant middleware provides reasonable isolation for most operations, but has these gaps:
1. **findUnique bypass** (documented above) — the most critical gap
2. **Portal authentication** queries contacts without org scope at login time (`src/app/api/v1/public/portal-auth/route.ts`) — email lookup is global across all orgs
3. **Calendar feed** token lookup (`src/app/api/v1/calendar/feed/[token]/route.ts`, line 22) queries by `calendarToken` without org scope — by design, but means a leaked token exposes all org tasks
4. **No data export controls** — authenticated users with `export` permission can extract all org data via export endpoints with no volume limits or watermarking

---

## 5. Attack Surface Analysis

### External Entry Points — Public (Unauthenticated)

**1. Web-to-Lead Form (`/api/v1/public/leads` — POST)**
File: `src/app/api/v1/public/leads/route.ts`. Accepts `{name, email, phone, company, message, source, org_slug}`. CORS allows `*` (all origins). No rate limiting. Falls back to first organization if `org_slug` not found — leads from unknown sources go to an unintended org. Maximum message length 2000 chars. **Attack vectors:** spam injection, email harvesting via org_slug enumeration, resource exhaustion.

**2. Event Registration (`/api/v1/public/events/[id]/register` — POST)**
File: `src/app/api/v1/public/events/[id]/register/route.ts`. Creates event participant and sends confirmation email with ICS calendar attachment. Uses org SMTP settings for email delivery. **Attack vectors:** email bombing (register many times for same event), SMTP abuse via org email config, ICS injection.

**3. Customer Portal Authentication (`/api/v1/public/portal-auth` — POST, DELETE)**
File: `src/app/api/v1/public/portal-auth/route.ts`. Login with email/password, bcrypt validation, JWT cookie. Portal registration at `/register`, password setting at `/set-password`. **Attack vectors:** credential brute force (no rate limiting), account enumeration (error message differences), token theft if `Secure` flag missing on cookie.

**4. Portal Knowledge Base (`/api/v1/public/portal-kb` — GET)**
Public access to published KB articles. Content rendered with `dangerouslySetInnerHTML` on the portal page. **Attack vector:** stored XSS via KB article content.

**5. Portal Chat (`/api/v1/public/portal-chat` — POST)**
AI-powered customer support using Claude API. Accepts user messages and returns AI responses. **Attack vectors:** prompt injection, resource exhaustion (AI API costs), data exfiltration via prompt manipulation.

**6. Portal Tickets (`/api/v1/public/portal-tickets` — GET, POST)**
Customer ticket creation/viewing. Requires portal token cookie. **Attack vectors:** IDOR on ticket IDs, cross-customer ticket access.

**7. WhatsApp Webhook (`/api/v1/webhooks/whatsapp` — GET, POST)**
File: `src/app/api/v1/webhooks/whatsapp/route.ts` (616 lines). GET for Meta verification challenge (token: `WHATSAPP_VERIFY_TOKEN` env var, default fallback: `"leaddrive-whatsapp-verify-2026"`). POST receives messages, triggers AI auto-reply via Claude API, auto-creates tickets on `[ESCALATE]`/`[CREATE_TICKET]` markers. **Attack vectors:** webhook spoofing with known default token, prompt injection via WhatsApp messages to AI auto-reply, ticket spam via escalation markers.

**8. Telegram Webhook (`/api/v1/webhooks/telegram` — POST)**
File: `src/app/api/v1/webhooks/telegram/route.ts`. Bot token passed as URL query parameter `?token=<botToken>`. **Attack vectors:** token leakage in server logs, webhook spoofing.

**9. Facebook/Instagram Webhook (`/api/v1/webhooks/facebook` — GET, POST)**
File: `src/app/api/v1/webhooks/facebook/route.ts`. Verification with `FACEBOOK_VERIFY_TOKEN` (default: `"leaddrive_fb_verify"`). **Attack vector:** webhook spoofing with known default token.

**10. VKontakte Webhook (`/api/v1/webhooks/vkontakte` — GET, POST)**
File: `src/app/api/v1/webhooks/vkontakte/route.ts`. Similar webhook pattern.

**11. Journey Processor (`/api/v1/journeys/process` — POST)**
File: `src/app/api/v1/journeys/process/route.ts`. **No authentication required.** Processes up to 50 pending journey enrollments per call, advancing workflow steps that can trigger emails, SMS, and Telegram messages. **Attack vectors:** repeated calls to trigger mass email/SMS sending, workflow abuse, resource exhaustion.

**12. Calendar Feed (`/api/v1/calendar/feed/[token]` — GET)**
File: `src/app/api/v1/calendar/feed/[token]/route.ts`. Token-based ICS feed exposing all org tasks. Tokens never expire and cannot be revoked. **Attack vector:** token brute force or leakage → persistent read access to all org calendar data.

**13. Health Check (`/api/health` — GET)**
Basic health endpoint. Low risk.

### External Entry Points — Authenticated (200+ Endpoints)

The authenticated API surface spans the entire CRM/ERP functionality. Key high-risk authenticated endpoints:

| Endpoint | Methods | Risk | Notes |
|----------|---------|------|-------|
| `/api/v1/contacts/bulk-delete` | POST | HIGH | Permanent mass deletion, no soft delete |
| `/api/v1/contracts/[id]/files` | POST | HIGH | File upload to `/public/uploads/contracts/` — 10MB limit, MIME whitelist |
| `/api/v1/invoices/[id]/pdf` | GET | MEDIUM | PDF generation with user data — potential injection |
| `/api/v1/invoices/[id]/send` | POST | HIGH | Sends email with invoice to customer addresses |
| `/api/v1/invoices/[id]/act` | GET, POST | HIGH | Generates legal documents with HTML template injection vectors |
| `/api/v1/campaigns/[id]/send` | POST | HIGH | Mass email sending to contacts |
| `/api/v1/settings/smtp` | GET, PUT | CRITICAL | Stores SMTP credentials, enables SSRF via custom SMTP host |
| `/api/v1/settings/roles` | CRUD | HIGH | Can modify RBAC roles and permissions |
| `/api/v1/settings/permissions` | CRUD | HIGH | Can modify the permission matrix itself |
| `/api/v1/ai/chat` | POST | MEDIUM | Direct Claude API interaction with org context |
| `/api/v1/pricing/export` | GET | MEDIUM | Full pricing data export |
| `/api/v1/budgeting/export` | GET | MEDIUM | Full budget data export |
| `/api/v1/budgeting/import-csv` | POST | MEDIUM | Batch data import, category mapping |
| `/api/v1/recurring-invoices/generate` | POST | HIGH | Batch invoice generation |
| `/api/v1/cost-model/seed-clients` | POST | LOW | Creates test data in production |

### Input Validation Patterns

Input validation uses **Zod schemas** on most API routes, providing structured validation of request bodies. Examples: `createContactSchema` validates contacts, `invoiceSchema` validates invoices. The `sanitize.ts` module provides `sanitizeHtml()` (DOMPurify with restrictive allowed tags: `[b, i, em, strong]`) and `sanitizeText()` (strips `<>` characters only). However, **sanitization is inconsistently applied** — KB article content, email template bodies, invoice descriptions, and AI outputs bypass sanitization entirely. Several API routes catch exceptions with `String(e)` in error responses, potentially leaking internal error details.

### Background Processing

The journey engine (`src/lib/journey-engine.ts`) processes automated workflow steps triggered by the unauthenticated `/api/v1/journeys/process` endpoint. Steps can send emails (via SMTP), SMS (via Twilio), Telegram messages, and WhatsApp messages. The engine runs with the organization's stored credentials and has no separate privilege boundary — it inherits full access to all configured channels. Webhook dispatching (`src/lib/webhooks.ts`) is fire-and-forget async, sending CRM event payloads to admin-configured URLs with HMAC signatures.

### Notable Out-of-Scope Components

| Component | Location | Reason |
|-----------|----------|--------|
| Migration scripts | `scripts/` (30+ files) | CLI-only execution |
| Database seeds | `prisma/seed.ts` | CLI-only execution |
| Telegram bridge | `telegram-bridge/bot.js` | Standalone Node.js process |
| CI/CD pipelines | `.github/workflows/` | GitHub Actions only |
| Setup script | `setup.sh` | Local shell script |
| Design system docs | `design-system/` | Static documentation |

---

## 6. Infrastructure & Operational Security

### Secrets Management

Secrets are managed via environment variables loaded from `.env` files (git-ignored). The `.env.example` template documents required secrets: `DATABASE_URL`, `NEXTAUTH_SECRET`, `ANTHROPIC_API_KEY`, `WHATSAPP_ACCESS_TOKEN`, `STRIPE_SECRET_KEY`, etc. **However, the `docker-compose.yml` contains hardcoded development secrets:** `NEXTAUTH_SECRET=dev-secret-change-in-production` (line 11), `POSTGRES_PASSWORD=leaddrive` (line 25). Multiple code paths have hardcoded fallback values: the WhatsApp webhook uses `"leaddrive-whatsapp-verify-2026"` as a default verification token, and the portal auth uses `"portal-secret"` as a JWT signing fallback. No secrets rotation mechanism exists. Database-stored secrets (SMTP passwords, API tokens, bot tokens in `ChannelConfig`) are unencrypted. No integration with external secrets management (Vault, AWS Secrets Manager) is present.

### Configuration Security

**Security Headers:** No custom security headers are configured. The `next.config.ts` file (lines 1-11) contains only `output: "standalone"`, `typescript: { ignoreBuildErrors: true }`, and an i18n plugin. **Missing headers:** Content-Security-Policy, Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy. No Nginx, Kubernetes Ingress, or CDN configuration files exist in the repository — headers must be configured at the infrastructure level (not present in code).

**CORS Configuration:** The main Next.js app has no explicit CORS configuration (relies on browser Same-Origin Policy). The FastAPI compute service (`services/compute/main.py`, lines 9-14) configures CORS to allow only `http://localhost:3000` with all methods and headers — this is development-only and would need updating for production.

**Docker Deployment Risks:**
- PostgreSQL exposed on `0.0.0.0:5432` with default credentials `leaddrive:leaddrive`
- Redis exposed on `0.0.0.0:6379` with **no authentication**
- Compute service exposed on `0.0.0.0:8000` running in `--reload` (development) mode
- No TLS between services on the Docker network
- Database backups stored unencrypted at `./backups` with same hardcoded credentials

**CI/CD Security:** GitHub Actions workflows (`.github/workflows/deploy.yml`) deploy via SSH using `appleboy/ssh-action` with `SSH_PRIVATE_KEY` from GitHub secrets. No approval gates for production deployment. Tag-based (`v*`) auto-deploy to production.

### External Dependencies

| Service | Library | Security Notes |
|---------|---------|----------------|
| Anthropic Claude API | `@anthropic-ai/sdk 0.80.0` | API key in env, used for AI chat, auto-reply, analysis |
| WhatsApp Cloud API | Native `fetch()` | Bearer token auth, graph.facebook.com/v21.0 |
| Facebook/Instagram API | Native `fetch()` | **Access token in URL query string** (anti-pattern, log exposure risk) |
| Telegram Bot API | Native `fetch()` | Bot token in URL path |
| Twilio SMS | Native `fetch()` | HTTP Basic Auth with accountSid:apiKey |
| SMTP Email | `nodemailer 7.0.13` | Dynamic per-org config, `rejectUnauthorized: false` (TLS bypass) |

### Monitoring & Logging

Application logging uses **Pino 10.3.1** for structured JSON logging. Audit logging is implemented via `logAudit()` in `src/lib/prisma.ts` (fire-and-forget async to database). Audit events cover: user management, contact CRUD, portal auth, deal changes, budget changes. Audit logs are queryable via `/api/v1/audit-log` (authenticated, org-scoped). **Gaps:** No centralized log aggregation visible, no security-specific alerting, no failed login attempt tracking, audit logs contain unredacted PII and sensitive data, `console.error` used in many API routes with raw exception objects that may leak internal details.

---

## 7. Overall Codebase Indexing

The LeadDrive v2 codebase is organized as a standard Next.js App Router project with the primary source in `src/`. The `src/app/` directory contains all routes organized by path segments: `(dashboard)/` for authenticated CRM pages, `(marketing)/` for public marketing pages, `portal/` for the customer portal, `login/` for auth flows, and `api/` for all API endpoints. The API layer is deeply nested under `src/app/api/v1/` with 239+ route handler files, plus cost-model and budgeting APIs at `src/app/api/cost-model/` and `src/app/api/budgeting/`. Shared business logic resides in `src/lib/` containing authentication (`auth.ts`, `api-auth.ts`, `portal-auth.ts`), permissions (`permissions.ts`), database (`prisma.ts`), and integration libraries (`whatsapp.ts`, `facebook.ts`, `email.ts`, `webhooks.ts`, `compute.ts`, `journey-engine.ts`). UI components are in `src/components/` with domain-specific subdirectories. The `services/compute/` directory contains the Python FastAPI microservice with its own Dockerfile and requirements. The `scripts/` directory (30+ files) contains CLI-only migration and seed utilities. Build orchestration uses npm scripts defined in `package.json`, with Docker Compose for multi-service orchestration. The `prisma/` directory houses the schema and migrations. Testing infrastructure appears minimal — no dedicated test directories or test frameworks were found in dependencies. The `telegram-bridge/` contains a standalone Telegram bot with its own `package.json` and `node_modules`. The `public/` directory serves static assets and hosts uploaded contract files at `public/uploads/contracts/`. Schema files (OpenAPI/Swagger/GraphQL) were **not found** in the codebase — APIs are documented only through TypeScript types and Zod schemas.

---

## 8. Critical File Paths

### Configuration
- `next.config.ts` — Next.js config (ignoreBuildErrors: true)
- `docker-compose.yml` — Multi-service deployment (hardcoded credentials)
- `Dockerfile` — Next.js production build (multi-stage, non-root)
- `services/compute/Dockerfile` — FastAPI compute service (--reload dev mode)
- `services/compute/main.py` — FastAPI app with CORS config
- `services/compute/config.py` — Environment config for compute service
- `services/compute/requirements.txt` — Python dependencies
- `.env.example` — Secret template with default values
- `package.json` — Dependencies including NextAuth beta, bcryptjs, otplib
- `tsconfig.json` — TypeScript configuration
- `eslint.config.mjs` — ESLint configuration
- `components.json` — Shadcn/UI component configuration

### Authentication & Authorization
- `src/lib/auth.ts` — NextAuth configuration, credentials provider, 2FA logic, **hardcoded backdoor** (lines 95-106)
- `src/lib/api-auth.ts` — API authentication helpers (getOrgId, requireAuth, checkPermission)
- `src/lib/permissions.ts` — RBAC permission matrix (5 roles × 13+ modules)
- `src/lib/portal-auth.ts` — Customer portal JWT token creation/verification
- `src/middleware.ts` — Route protection, 2FA enforcement, header injection
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth route handler
- `src/app/api/v1/auth/register/route.ts` — User/org registration
- `src/app/api/v1/auth/forgot-password/route.ts` — Password reset initiation
- `src/app/api/v1/auth/reset-password/route.ts` — Password reset execution
- `src/app/api/v1/auth/verify-2fa/route.ts` — Login 2FA verification
- `src/app/api/v1/auth/2fa/route.ts` — 2FA enable/verify
- `src/app/api/v1/auth/totp/setup/route.ts` — TOTP setup (returns secret in response)
- `src/app/api/v1/auth/totp/verify/route.ts` — TOTP verify (returns backup codes)
- `src/app/api/v1/auth/totp/disable/route.ts` — TOTP disable
- `src/app/api/v1/auth/totp/status/route.ts` — 2FA status check
- `src/app/api/v1/public/portal-auth/route.ts` — Portal login/logout
- `src/app/api/v1/public/portal-auth/register/route.ts` — Portal registration
- `src/app/api/v1/public/portal-auth/set-password/route.ts` — Portal password set

### API & Routing
- `src/app/api/v1/contacts/route.ts` — Contact CRUD (representative auth pattern)
- `src/app/api/v1/contacts/bulk-delete/route.ts` — Mass contact deletion
- `src/app/api/v1/deals/route.ts` — Deal management
- `src/app/api/v1/invoices/route.ts` — Invoice CRUD
- `src/app/api/v1/invoices/[id]/pdf/route.ts` — PDF generation
- `src/app/api/v1/invoices/[id]/send/route.ts` — Invoice email sending
- `src/app/api/v1/invoices/[id]/act/route.ts` — Legal document generation (HTML injection vectors)
- `src/app/api/v1/invoices/[id]/payments/route.ts` — Payment recording
- `src/app/api/v1/offers/[id]/send/route.ts` — Offer email sending
- `src/app/api/v1/campaigns/[id]/send/route.ts` — Campaign mass email
- `src/app/api/v1/contracts/[id]/files/route.ts` — File upload endpoint
- `src/app/api/v1/contracts/[id]/files/[fileId]/route.ts` — File delete
- `src/app/api/v1/public/leads/route.ts` — Public lead capture (CORS: *)
- `src/app/api/v1/public/events/[id]/register/route.ts` — Public event registration
- `src/app/api/v1/public/portal-kb/route.ts` — Public KB articles
- `src/app/api/v1/public/portal-chat/route.ts` — Public AI chat
- `src/app/api/v1/public/portal-tickets/route.ts` — Portal tickets
- `src/app/api/v1/webhooks/whatsapp/route.ts` — WhatsApp webhook (616 lines, AI auto-reply)
- `src/app/api/v1/webhooks/telegram/route.ts` — Telegram webhook (token in URL)
- `src/app/api/v1/webhooks/facebook/route.ts` — Facebook webhook
- `src/app/api/v1/webhooks/vkontakte/route.ts` — VKontakte webhook
- `src/app/api/v1/journeys/process/route.ts` — Unauthenticated journey processor
- `src/app/api/v1/calendar/feed/[token]/route.ts` — Public calendar feed (no expiry)
- `src/app/api/v1/calendar/generate-token/route.ts` — Calendar token generation
- `src/app/api/v1/ai/chat/route.ts` — AI chat endpoint
- `src/app/api/v1/ai/route.ts` — AI general endpoint
- `src/app/api/v1/settings/smtp/route.ts` — SMTP credential management (SSRF vector)
- `src/app/api/v1/settings/roles/route.ts` — Role management
- `src/app/api/v1/settings/permissions/route.ts` — Permission management
- `src/app/api/v1/channels/route.ts` — Channel config (returns secrets in response)
- `src/app/api/v1/channels/[id]/route.ts` — Channel detail
- `src/app/api/v1/users/route.ts` — User management
- `src/app/api/v1/users/[id]/route.ts` — User detail (password update with 10 rounds)
- `src/app/api/v1/pricing/export/route.ts` — Pricing data export
- `src/app/api/v1/budgeting/export/route.ts` — Budget data export
- `src/app/api/v1/budgeting/import-csv/route.ts` — CSV batch import
- `src/app/api/budgeting/snapshot/route.ts` — Raw SQL query ($queryRaw)
- `src/app/api/v1/workflows/route.ts` — Workflow automation rules
- `src/app/api/v1/inbox/route.ts` — Inbox with Telegram/Twilio/email sending
- `src/app/api/v1/inbox/conversations/[id]/messages/route.ts` — Conversation messages
- `src/app/api/v1/recurring-invoices/generate/route.ts` — Batch invoice generation
- `src/app/api/v1/portal-users/route.ts` — Portal user management
- `src/app/api/v1/cost-model/ai-analysis/route.ts` — Cost model AI analysis
- `src/app/api/v1/cost-model/seed-clients/route.ts` — Test data seeder
- `src/app/api/v1/ai-observations/route.ts` — AI observations (JSON.parse of AI output)
- `src/app/api/budgeting/ai-narrative/route.ts` — AI budget narrative

### Data Models & DB Interaction
- `prisma/schema.prisma` — Full database schema (2218 lines, multi-tenant)
- `prisma/migrations/` — Migration history
- `src/lib/prisma.ts` — Prisma client with tenant middleware, audit logging

### Dependency Manifests
- `package.json` — Node.js dependencies (NextAuth beta, bcryptjs, otplib, Zod, DOMPurify)
- `package-lock.json` — Locked dependency versions
- `services/compute/requirements.txt` — Python dependencies
- `telegram-bridge/package.json` — Telegram bridge dependencies

### Sensitive Data & Secrets Handling
- `src/lib/email.ts` — SMTP config from DB (plaintext passwords), `rejectUnauthorized: false`
- `src/lib/whatsapp.ts` — WhatsApp API client (bearer token auth)
- `src/lib/facebook.ts` — Facebook API client (token in query string)
- `src/lib/portal-auth.ts` — Portal JWT signing (hardcoded fallback secret)
- `src/lib/compute.ts` — Compute service HTTP client (path concatenation SSRF)

### Middleware & Input Validation
- `src/lib/sanitize.ts` — HTML/text sanitization (DOMPurify, inconsistently applied)
- `src/lib/rate-limit.ts` — In-memory rate limiting (defined but NOT used)
- `src/lib/webhooks.ts` — Webhook HMAC-SHA256 signing and dispatch (SSRF via arbitrary URL)

### Logging & Monitoring
- `src/lib/prisma.ts` (lines 73-85) — Audit logging (logAudit function, PII in logs)

### Infrastructure & Deployment
- `docker-compose.yml` — Development deployment (exposed services, default credentials)
- `Dockerfile` — Production Next.js image (multi-stage, non-root user)
- `services/compute/Dockerfile` — Compute service image (--reload mode)
- `.github/workflows/ci.yml` — CI pipeline (lint, build)
- `.github/workflows/deploy.yml` — CD pipeline (SSH deploy, no approval gates)

### XSS-Relevant Frontend Components
- `src/components/email-template-form.tsx` — innerHTML (lines 81, 90, 338), dangerouslySetInnerHTML (line 392)
- `src/app/(dashboard)/knowledge-base/[id]/page.tsx` — dangerouslySetInnerHTML (line 139)
- `src/app/portal/knowledge-base/page.tsx` — dangerouslySetInnerHTML (line 81, public access)
- `src/app/(dashboard)/email-log/page.tsx` — dangerouslySetInnerHTML (line 246)
- `src/components/profitability/ai-observations.tsx` — dangerouslySetInnerHTML with custom markdown parser (line 162)
- `src/lib/invoice-html.ts` — HTML template strings with unescaped interpolation (lines 148-242, 274-322)

### Journey & Automation Engine
- `src/lib/journey-engine.ts` — Automated email/SMS/Telegram/WhatsApp sending

---

## 9. XSS Sinks and Render Contexts

### Critical XSS Sinks (Network-Accessible)

**All sinks below are on pages served by the Next.js application to authenticated users or public visitors. Sanitization status and input source documented for each.**

#### 9.1 Portal Knowledge Base — CRITICAL (Public Access, Stored XSS)
- **File:** `src/app/portal/knowledge-base/page.tsx`, **Line 81**
- **Sink:** `dangerouslySetInnerHTML={{ __html: selectedArticle.content }}`
- **Render Context:** HTML Body Context
- **Input Source:** `article.content` from database, created by CRM users via KB editor
- **Sanitization:** NONE — raw HTML from database rendered directly
- **Attack Scenario:** CRM user with KB write access injects `<img src=x onerror=alert(document.cookie)>` into article content → all portal visitors execute the XSS payload
- **Network Surface:** YES — portal pages are public-facing

#### 9.2 Dashboard Knowledge Base — HIGH
- **File:** `src/app/(dashboard)/knowledge-base/[id]/page.tsx`, **Line 139**
- **Sink:** `dangerouslySetInnerHTML={{ __html: article.content }}`
- **Render Context:** HTML Body Context
- **Input Source:** `article.content` from database
- **Sanitization:** NONE
- **Network Surface:** YES — authenticated dashboard page

#### 9.3 Email Template Editor — HIGH (Multiple Sinks)
- **File:** `src/components/email-template-form.tsx`
  - **Line 81:** `editorRef.current.innerHTML = form.htmlBody || ""` — Direct `innerHTML` assignment
  - **Line 90:** `editorRef.current.innerHTML = form.htmlBody || ""` — Re-initialization
  - **Line 338:** `current.innerHTML = html` — HTML source toggle
  - **Line 392:** `dangerouslySetInnerHTML={{ __html: form.htmlBody... }}` — Preview tab
- **Render Context:** HTML Body Context
- **Input Source:** User-authored email template HTML body
- **Sanitization:** PARTIAL — template variable replacement (`{{var}}` → demo spans), but original HTML not sanitized
- **Network Surface:** YES — authenticated dashboard component

#### 9.4 Email Log Viewer — HIGH
- **File:** `src/app/(dashboard)/email-log/page.tsx`, **Line 246**
- **Sink:** `dangerouslySetInnerHTML={{ __html: log.body }}`
- **Render Context:** HTML Body Context
- **Input Source:** `emailLog.body` from database — full email HTML including user-authored content and template-rendered data
- **Sanitization:** NONE
- **Network Surface:** YES — authenticated dashboard page

#### 9.5 AI Observations — HIGH (Custom Markdown Parser Injection)
- **File:** `src/components/profitability/ai-observations.tsx`, **Line 162**
- **Sink:** `dangerouslySetInnerHTML={{ __html: markdownToHtml(result.analysis) }}`
- **Render Context:** HTML Body Context
- **Input Source:** Claude AI API response text processed by custom `markdownToHtml()` function
- **Sanitization:** INSUFFICIENT — Custom markdown parser (lines 22-56) uses string interpolation without HTML escaping:
  - Line 32: `html += '<h4 ...>${trimmed.slice(4)}</h4>'` — No escaping
  - Line 38: `html += '<li ...>${trimmed.slice(2)}</li>'` — No escaping
  - Line 44: `html += '<p ...>${trimmed}</p>'` — No escaping
  - Line 51: `html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")` — Capture group `$1` injected into HTML
- **Attack Scenario:** If AI response contains HTML entities (possible via prompt injection), they execute in the browser
- **Network Surface:** YES — authenticated dashboard component

#### 9.6 Invoice HTML Generation — HIGH (Server-Side HTML Injection → Email)
- **File:** `src/lib/invoice-html.ts`
  - **Line 148:** `${companyName}` — No escaping in HTML template
  - **Line 149:** `${companyVoen}`, `${companyAddress}` — No escaping
  - **Line 176-180:** `${clientCo?.name}`, `${clientCo?.email}`, `${clientCo?.phone}` — No escaping
  - **Line 199:** `${item.name}${item.description ? '<br><span...>${item.description}</span>' : ''}` — **CRITICAL:** `item.description` directly in HTML `<span>`
  - **Line 233-234:** `${signerName}`, `${signerTitle}` — No escaping
  - **Line 241-242:** `${terms}`, `${footerNote}` — No escaping
  - **Line 303:** `<h1 ...>${orgName}</h1>` — No escaping in email template
  - **Line 308:** `<p ...>${customMessage}</p>` — **CRITICAL:** User-authored custom message directly in HTML email
- **Render Context:** HTML Body Context (email body and document generation)
- **Input Source:** Company names, invoice item descriptions, custom messages — all user-controlled database fields
- **Sanitization:** NONE for any interpolated value
- **Network Surface:** YES — generated via `/api/v1/invoices/[id]/act` and `/api/v1/invoices/[id]/send`

#### 9.7 Invoice Act Document — HIGH (URL Attribute Injection)
- **File:** `src/app/api/v1/invoices/[id]/act/route.ts`
  - **Line 120-121:** `<img src="${companyLogoUrl}" alt="${companyName}" ...>` — Logo URL directly in `src` attribute
  - **Line 129:** `<td>${item.name}...${item.description}</td>` — Item data directly in HTML
- **Render Context:** HTML Attribute Context (src), HTML Body Context
- **Input Source:** `companyLogoUrl` from org settings, `item.name`/`item.description` from invoice items
- **Sanitization:** NONE — `companyLogoUrl` could be `javascript:alert(1)` or contain encoded XSS payloads
- **Network Surface:** YES — accessible via authenticated API endpoint

#### 9.8 ICS Calendar Injection — MEDIUM
- **File:** `src/app/api/v1/calendar/feed/[token]/route.ts`
  - **Lines 53, 59, 61:** `SUMMARY:${icsEscape(summary)}`, `DESCRIPTION:${icsEscape(task.description)}`
- **Render Context:** ICS/vCalendar format
- **Input Source:** `task.title`, `task.description` from database
- **Sanitization:** PARTIAL — `icsEscape()` (lines 4-6) escapes `\`, `;`, `,`, `\n` but **does NOT escape colons (`:`)** which can break ICS property parsing
- **Network Surface:** YES — public endpoint at `/api/v1/calendar/feed/[token]`

#### 9.9 Email Template Rendering — HIGH (Server-Side)
- **File:** `src/lib/email.ts`, **Lines 173-179**
- **Sink:** `renderTemplate()` — string replace `{{key}}` → value in HTML body
- **Render Context:** HTML Body Context (email)
- **Input Source:** Template variables including `contact.fullName`, other user-controlled fields
- **Sanitization:** NONE — values directly interpolated into HTML template
- **Usage:** Campaign emails (`campaigns/[id]/send/route.ts`, line 109-112), offer emails, invoice emails

### Sanitization Gap Analysis

The application has `src/lib/sanitize.ts` with two functions:
- `sanitizeHtml(input)` — DOMPurify with `ALLOWED_TAGS: ["b", "i", "em", "strong"]` (very restrictive)
- `sanitizeText(input)` — Only strips `<>` characters (insufficient for attribute/JS context XSS)

**Applied to:** Contact notes, deal descriptions (via Zod schema validation)
**NOT applied to:** KB article content, email template bodies, invoice item descriptions, AI outputs, email log bodies, custom messages, company names in templates

---

## 10. SSRF Sinks

### Critical SSRF Sinks (Network-Accessible)

#### 10.1 Webhook URL Dispatch — CRITICAL (Fully User-Controlled URL)
- **File:** `src/lib/webhooks.ts`, **Line 52**
- **Sink:** `await fetch(webhook.url, { method: "POST", ... })`
- **HTTP Client:** Native `fetch()`
- **User Input:** `webhook.url` — fully admin-controllable arbitrary URL stored in database
- **URL Control:** FULL — admin users register webhook URLs via `/api/v1/webhooks` settings
- **Validation:** NONE — no URL validation, no private IP blacklist, no protocol restriction
- **Impact:** CRITICAL — attacker with admin access can:
  - Access cloud metadata (`http://169.254.169.254/latest/meta-data/iam/security-credentials/`)
  - Scan internal network (`http://192.168.x.x:port/`)
  - Access internal services (`http://localhost:8000/`, `http://db:5432/`)
  - Exfiltrate data via POST body containing CRM event payloads
- **Trigger:** Any CRM event that dispatches webhooks (deals, contacts, leads updated)
- **Authentication Required:** Admin role

#### 10.2 SMTP Configuration — CRITICAL (Admin-Controlled Host/Port)
- **File:** `src/lib/email.ts`, **Lines 14-34, 54-55, 61**
- **Sink:** `nodemailer.createTransport({ host: config.smtpHost, port: config.smtpPort, ... })`
- **HTTP Client:** `nodemailer` SMTP library
- **User Input:** `smtpHost` and `smtpPort` — fully admin-controllable via `/api/v1/settings/smtp` PUT
- **URL Control:** FULL — admin sets arbitrary SMTP server host and port
- **Validation:** NONE — no host whitelist, no private IP blacklist
- **Additional Risk:** `rejectUnauthorized: false` (line 61) disables TLS certificate verification — enables MitM
- **Impact:** CRITICAL — attacker with admin access can:
  - Redirect all email traffic to attacker-controlled SMTP server (credential harvesting)
  - Target internal SMTP servers for reconnaissance
  - Connect to any TCP port on any host as an SMTP client
- **Trigger:** Any email sending: campaigns, invoices, offers, portal notifications, event confirmations
- **Authentication Required:** Admin role
- **Usage locations:**
  - `src/app/api/v1/campaigns/[id]/send/route.ts` (line 113)
  - `src/app/api/v1/offers/[id]/send/route.ts` (line 75)
  - `src/app/api/v1/inbox/route.ts` (lines 317-325)
  - `src/lib/journey-engine.ts` (lines 131-138)

#### 10.3 Compute Service Path Concatenation — HIGH
- **File:** `src/lib/compute.ts`, **Line 7**
- **Sink:** `await fetch(\`${COMPUTE_URL}${path}\`, { method: "POST", ... })`
- **HTTP Client:** Native `fetch()`
- **User Input:** `path` parameter — constructed from API route parameters
- **URL Control:** PARTIAL — path is concatenated to base URL without validation
- **Validation:** NONE — no path whitelist, no traversal prevention
- **Impact:** HIGH — authenticated attacker could potentially construct paths targeting unintended compute service endpoints
- **Base URL:** `process.env.COMPUTE_SERVICE_URL || "http://localhost:8000"` (line 1)
- **Authentication Required:** Yes (standard auth)

#### 10.4 Twilio SMS API — MEDIUM (Partial URL Control)
- **File:** `src/app/api/v1/inbox/route.ts`, **Lines 371-377**
- **File:** `src/lib/journey-engine.ts`, **Lines 155-169**
- **Sink:** `fetch(\`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json\`, ...)`
- **HTTP Client:** Native `fetch()` with HTTP Basic Auth
- **User Input:** `accountSid` from channel settings — admin-controllable
- **URL Control:** PARTIAL — accountSid interpolated into fixed Twilio URL
- **Validation:** NONE on accountSid format
- **Impact:** MEDIUM — limited SSRF since base domain is fixed to `api.twilio.com`
- **Authentication Required:** Admin role (channel config)

#### 10.5 Facebook API Token in Query String — MEDIUM (Token Exposure)
- **File:** `src/lib/facebook.ts`, **Lines 10, 33**
- **Sink:** `fetch(\`https://graph.facebook.com/v20.0/me/messages?access_token=${pageAccessToken}\`, ...)`
- **HTTP Client:** Native `fetch()`
- **User Input:** `pageAccessToken` from channel config database
- **URL Control:** NONE — fixed Meta API domain
- **Security Issue:** Access token in URL query string — will appear in:
  - Server access logs
  - Proxy logs
  - CDN logs
  - Network monitoring tools
- **Impact:** MEDIUM — token leakage via logs rather than SSRF
- **Authentication Required:** Admin role (channel config)

#### 10.6 Telegram Bot API — LOW (Token in URL Path)
- **Files:**
  - `src/app/api/v1/inbox/route.ts`, **Line 343**
  - `src/app/api/v1/inbox/conversations/[id]/messages/route.ts`, **Line 31**
  - `src/lib/journey-engine.ts`, **Line 219**
- **Sink:** `fetch(\`https://api.telegram.org/bot${tgChannel.botToken}/sendMessage\`, ...)`
- **HTTP Client:** Native `fetch()`
- **User Input:** `botToken` from channel config database
- **URL Control:** NONE — fixed Telegram API domain
- **Impact:** LOW — bot token in URL could leak via logs; no direct SSRF
- **Authentication Required:** Admin role (channel config)

#### 10.7 WhatsApp Cloud API — LOW
- **File:** `src/lib/whatsapp.ts`, **Lines 80, 204**
- **Sink:** `fetch(\`https://graph.facebook.com/v21.0/${config.phoneNumberId}/messages\`, ...)`
- **HTTP Client:** Native `fetch()` with Bearer token in Authorization header (correct pattern)
- **User Input:** `phoneNumberId` from channel config
- **URL Control:** NONE — fixed Meta API domain
- **Impact:** LOW — properly uses Authorization header, not query string
- **Authentication Required:** Admin role (channel config)

#### 10.8 Anthropic AI API — LOW
- **Files:**
  - `src/app/api/v1/ai/chat/route.ts` (line 8)
  - `src/app/api/v1/ai/route.ts` (line 11)
  - `src/app/api/v1/public/portal-chat/route.ts` (line 365)
  - `src/app/api/budgeting/ai-narrative/route.ts` (line 96)
  - `src/lib/cost-model/ai-analysis.ts` (line 138)
- **Sink:** `new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`
- **HTTP Client:** Anthropic SDK (internally uses fetch to api.anthropic.com)
- **User Input:** NONE on endpoint — API key from environment variable
- **URL Control:** NONE — fixed Anthropic API endpoint
- **Impact:** LOW for SSRF; MEDIUM for prompt injection leading to data exfiltration or API cost abuse
- **Authentication Required:** Varies (portal-chat is public; others require auth)

### SSRF Summary Matrix

| # | Sink | File:Line | Client | URL Control | Severity |
|---|------|-----------|--------|-------------|----------|
| 1 | Webhook dispatch | `src/lib/webhooks.ts:52` | fetch() | FULL | **CRITICAL** |
| 2 | SMTP config | `src/lib/email.ts:54-55` | nodemailer | FULL (host:port) | **CRITICAL** |
| 3 | Compute service | `src/lib/compute.ts:7` | fetch() | PARTIAL (path) | HIGH |
| 4 | Twilio SMS | `src/app/api/v1/inbox/route.ts:371` | fetch() | PARTIAL (accountSid) | MEDIUM |
| 5 | Facebook API | `src/lib/facebook.ts:10,33` | fetch() | NONE (token leak) | MEDIUM |
| 6 | Telegram API | `src/app/api/v1/inbox/route.ts:343` | fetch() | NONE (token leak) | LOW |
| 7 | WhatsApp API | `src/lib/whatsapp.ts:80,204` | fetch() | NONE | LOW |
| 8 | Anthropic AI | Multiple files | SDK | NONE | LOW |
