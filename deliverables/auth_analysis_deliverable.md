# Authentication Analysis Report

**Target:** https://v2.leaddrivecrm.org
**Date:** 2026-03-27
**Analyst:** Authentication Analysis Specialist
**Input:** `deliverables/recon_deliverable.md` + Direct source code review + Live application probing

---

## 1. Executive Summary

- **Analysis Status:** Complete
- **Key Outcome:** Eight exploitable authentication vulnerabilities were identified, spanning rate-limiting bypasses, a full 2FA enforcement bypass, a cross-tenant org-context forgery vector, and critical portal session management weaknesses. The application's authentication model is undermined by a systematic pattern of trusting attacker-controlled inputs (headers, session update payloads) without sufficient server-side re-validation.
- **Purpose of this Document:** This report provides the strategic context on the application's authentication mechanisms, dominant flaw patterns, and key architectural details necessary to effectively exploit the vulnerabilities listed in the exploitation queue.

### Vulnerability Summary Table

| ID | Title | Type | Confidence | Externally Exploitable |
|---|---|---|---|---|
| AUTH-VULN-01 | Rate-Limit Bypass via x-forwarded-for Spoofing | Abuse_Defenses_Missing | High | ✅ |
| AUTH-VULN-02 | No Rate Limiting on verify-2fa / Backup Code Brute-Force | Abuse_Defenses_Missing | High | ✅ |
| AUTH-VULN-03 | No Rate Limiting on Portal Login | Abuse_Defenses_Missing | High | ✅ |
| AUTH-VULN-04 | 2FA/needsSetup2fa Enforcement Bypass via NextAuth Session Update | Login_Flow_Logic | High | ✅ |
| AUTH-VULN-05 | x-organization-id Header Forgery (Cross-Tenant Auth Context) | Session_Management_Flaw | High | ✅ |
| AUTH-VULN-06 | Weak/Hardcoded portal-token JWT Secret Fallback | Token_Management_Issue | Medium | ✅ |
| AUTH-VULN-07 | portal-token Cookie Missing `secure` Flag + No HSTS | Transport_Exposure | Medium | ✅ |
| AUTH-VULN-08 | Calendar Token Never Expires / No Revocation | Token_Management_Issue | High | ✅ |
| AUTH-VULN-09 | User Enumeration in Portal Authentication Endpoints | Login_Flow_Logic | High | ✅ |
| AUTH-VULN-10 | Unauthenticated `POST /api/v1/journeys/process` Endpoint | Authentication_Bypass | High | ✅ |

---

## 2. Dominant Vulnerability Patterns

### Pattern 1: Attacker-Controlled Inputs Trusted Without Server-Side Validation

- **Description:** The most pervasive pattern found is the application trusting attacker-controlled values — HTTP headers and client-driven session update payloads — without sufficient server-side re-validation. Two distinct manifestations exist: (a) the rate-limiter uses `x-forwarded-for` to identify IPs, allowing any attacker to rotate this header to bypass rate limits; (b) the NextAuth JWT callback unconditionally honors client-sent `{needs2fa: false, needsSetup2fa: false}` session update payloads, allowing an authenticated user to clear the 2FA enforcement gate without ever verifying a TOTP code.
- **Implication:** The rate-limit bypass enables unlimited brute-force / credential-stuffing on the login endpoint. The session update bypass allows any attacker who obtains account credentials — but lacks the TOTP secret — to bypass the mandatory 2FA setup enforcement.
- **Representative Findings:** `AUTH-VULN-01`, `AUTH-VULN-04`.

### Pattern 2: Missing Rate Limiting on Critical Unauthenticated Endpoints

- **Description:** While the middleware applies a 10-requests-per-minute rate limit to `/api/auth` (NextAuth login), several other critical unauthenticated authentication endpoints are entirely unprotected: `POST /api/v1/auth/verify-2fa`, `POST /api/v1/auth/reset-password`, and `POST /api/v1/public/portal-auth`. This last endpoint is entirely public (explicit `NextResponse.next()` shortcut in middleware) and has zero rate control.
- **Implication:** Backup TOTP codes (8 hex chars = 4 bytes ≈ 4 billion values with only 8 codes per account) can be brute-forced. Portal customer accounts can be password-sprayed with no throttling.
- **Representative Findings:** `AUTH-VULN-02`, `AUTH-VULN-03`.

### Pattern 3: Cross-Tenant Session Context Forgery

- **Description:** The Next.js middleware constructs modified headers via `new Headers(req.headers)` and calls `NextResponse.next({ headers })`. Due to the missing `request:` wrapper in the Next.js API (`NextResponse.next({ request: { headers } })` is the correct form for forwarding modified headers to the route handler), the API routes still receive the **original, unmodified** request headers. `getOrgId()` in `src/lib/api-auth.ts` reads `req.headers.get("x-organization-id")` as its fast-path and returns it immediately without cross-referencing the JWT. Any authenticated user can supply a forged `x-organization-id` header to hijack the org context for every API call.
- **Implication:** Any authenticated user can access, modify, and delete data belonging to any other tenant simply by supplying a different organization ID in the request header. This is a multi-tenant isolation collapse.
- **Representative Finding:** `AUTH-VULN-05`.

### Pattern 4: Weak/Absent Token Lifecycle Management (Portal & Calendar)

- **Description:** Two token-based authentication systems (portal JWT and calendar feed tokens) have critical lifecycle weaknesses. The `portal-token` is signed with `NEXTAUTH_SECRET || "portal-secret"` — the hardcoded fallback "portal-secret" allows any attacker to forge valid portal JWTs. Calendar feed tokens are never-expiring static strings with no revocation mechanism; a once-leaked token grants permanent read access.
- **Implication:** Forged portal tokens allow impersonation of any portal customer. Permanent calendar tokens create a long-tail exposure window for any credential leak.
- **Representative Findings:** `AUTH-VULN-06`, `AUTH-VULN-08`.

---

## 3. Strategic Intelligence for Exploitation

### Authentication Methods

| Layer | Method | Cookie / Token | Expiry | Notes |
|---|---|---|---|---|
| CRM Dashboard | NextAuth JWT (A256CBC-HS512 JWE) | `__Secure-authjs.session-token` | Default NextAuth (30 days) | HttpOnly, Secure, SameSite=Lax confirmed live |
| CSRF Protection | NextAuth CSRF token | `__Host-authjs.csrf-token` | Session | HttpOnly, Secure, SameSite=Lax |
| Customer Portal | Custom HS256 JWT | `portal-token` | 7 days | **Missing `secure` flag** (code-confirmed); HS256 key = `NEXTAUTH_SECRET || "portal-secret"` |
| Calendar Feed | Static URL token | URL path `[token]` | **Never** | `crypto.randomBytes(32).toString("base64url")` — high entropy but no TTL |

### Session Token Details

- **Main session** (`__Secure-authjs.session-token`): Encrypted JWE containing `{ role, organizationId, plan, needs2fa, needsSetup2fa }`. JWT strategy — no server-side session invalidation on logout. Proper `Secure`, `HttpOnly`, `SameSite=Lax` flags observed live.
- **Portal token** (`portal-token`): Plain HS256 JWT containing `{ contactId, organizationId, companyId, fullName, email }`. Signed with `NEXTAUTH_SECRET || "portal-secret"`. Cookie lacks `secure` flag. No server-side revocation on `DELETE /api/v1/public/portal-auth`.
- **Calendar token**: Static `base64url` string stored in `User.calendarToken` column. Referenced only at `GET /api/v1/calendar/feed/[token]`. Never expires or rotates.

### Password Policy

- **Min length**: 8 chars (registration and password-reset), 6 chars (login schema — inconsistency, but not directly exploitable).
- **Complexity**: No uppercase, digit, or symbol requirements enforced server-side.
- **Common password check**: None found.
- **Hashing**: `bcrypt` with cost factor 12 (strong).

### 2FA Architecture

- **TOTP**: `otplib` library with standard RFC 6238. Backup codes: 8 codes per account, each 4 bytes (8 hex chars).
- **Enrollment gate**: `needs2fa: user.totpEnabled === true` is embedded in the JWT at login time. This creates a redundant second TOTP verification via the verify-2fa page.
- **Setup enforcement**: `needsSetup2fa: user.require2fa === true && user.totpEnabled === false` — enforced by middleware redirect to `/login/setup-2fa`.
- **CRITICAL BYPASS**: Both flags can be cleared by POSTing `{"needs2fa": false, "needsSetup2fa": false}` to `POST /api/auth/session` with a valid session cookie. The JWT callback honors these updates unconditionally. (`src/lib/auth.ts` lines 113–117)

### Rate Limiting Architecture

- **Scope**: Applied only to POST requests matching `/api/auth`, `/login`, `/register`, `/forgot-password` (UI path, not API path).
- **Config**: `RATE_LIMIT_CONFIG.public = { maxRequests: 10, windowMs: 60000 }` — 10 requests/minute.
- **Implementation**: In-memory `Map` (per-process, not distributed). Key: `auth:{x-forwarded-for}`. **Attacker-controlled key — trivially bypassable by rotating the header.**
- **Unprotected endpoints**: `/api/v1/auth/verify-2fa`, `/api/v1/auth/reset-password`, `/api/v1/public/portal-auth`, `/api/v1/public/portal-auth/register`, `/api/v1/public/portal-auth/set-password`.

### Transport Security (Live Observations)

- HTTPS enforced via nginx 301 redirect from HTTP.
- **No `Strict-Transport-Security` header** observed on any response.
- `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate` present on authenticated pages ✓.
- Main session cookies use `__Secure-` and `__Host-` prefixes with proper `Secure` flags ✓.
- `portal-token` cookie: no `secure` flag (code-confirmed, not overridden by framework prefix).

---
