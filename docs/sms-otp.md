# SMS OTP

Backend-only (for now) one-time code generation and verification over SMS.
Backs flows like phone-verification, login 2FA, and sensitive-action
confirmation. Ships as part of Phase 1 of the TT gap closure.

## Code map

| Piece | Path |
|---|---|
| Library | `src/lib/sms.ts` |
| Send endpoint | `src/app/api/v1/auth/sms-otp/send/route.ts` |
| Verify endpoint | `src/app/api/v1/auth/sms-otp/verify/route.ts` |
| Model | `prisma/schema.prisma` → `OtpCode` |
| Migration | `prisma/migrations/20260417120000_add_otp_codes/` |
| Tests | `src/__tests__/lib-sms-otp.test.ts` |

## Data model

```prisma
model OtpCode {
  id             String    @id @default(cuid())
  organizationId String?   // nullable — pre-auth flows (signup) may omit
  phone          String
  codeHash       String    // bcrypt(code), never plaintext
  purpose        String    // "login" | "2fa" | "verification" | "sensitive_action"
  attempts       Int       @default(0)
  expiresAt      DateTime
  usedAt         DateTime?
  createdAt      DateTime  @default(now())
}
```

## Security properties

- **Hashed at rest** — `codeHash` = `bcrypt(code, cost=8)`. Plaintext is
  transmitted once via SMS and discarded.
- **Single use** — success marks `usedAt`. Prior unused codes for the same
  `phone + purpose` are invalidated when a new one is issued.
- **Short TTL** — 10 minutes. After expiry, verify returns "expired".
- **Bounded verify attempts** — 5 wrong attempts locks the code (sets
  `usedAt`). Each wrong attempt increments `attempts`.
- **Rate limits on `send`** — 3 sends per 10 min per phone; 10 sends per 10 min
  per IP. Blocks SMS bombing and carrier charges. Uses the existing
  `checkRateLimit` infra in `src/lib/rate-limit.ts`.

## API

### POST `/api/v1/auth/sms-otp/send`

Body:
```json
{ "phone": "+15551234567", "purpose": "login" }
```

- `purpose` ∈ `login | 2fa | verification | sensitive_action`.
- Returns `{ success: true }` on 200.
- Returns `{ success: true, debugCode: "123456" }` **only in non-production**
  for local testing.
- Returns 429 when per-phone or per-IP limit is exceeded.
- Returns 500 when SMS provider is not configured.

### POST `/api/v1/auth/sms-otp/verify`

Body:
```json
{ "phone": "+15551234567", "code": "123456", "purpose": "login" }
```

- Returns 200 `{ success: true }` on match.
- Returns 400 on invalid/expired code.
- Returns 429 after too many attempts on the same code.

## Provider selection

`sendSms` resolves the provider in this order:

1. `ChannelConfig(voip).settings.smsProvider` — per-org override
   (`"twilio"` | `"vonage"` | `"atl"`)
2. `SMS_PROVIDER` env var (default: `"twilio"`)

All three providers (Twilio, Vonage, ATL) support env-level fallbacks for
pre-auth flows (signup, phone verification before an org exists).

### Twilio

```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...
```

Org settings: `{ accountSid, authToken, twilioNumber }`

### Vonage (Nexmo)

```bash
VONAGE_API_KEY=...
VONAGE_API_SECRET=...
VONAGE_FROM_NAME=LeadDrive
```

Org settings: `{ apiKey, apiSecret, fromName }`

### ATL SMS (Azerbaijan)

```bash
ATL_LOGIN=...
ATL_PASSWORD=...
ATL_TITLE=TEST           # sender name; must be pre-registered with ATL
ATL_ENDPOINT=https://send.atlsms.az:7443/bulksms/api   # optional override
```

Org settings: `{ smsProvider: "atl", atlLogin, atlPassword, atlTitle }`

ATL uses an XML-over-HTTPS protocol. The adapter:

- Escapes XML-unsafe chars (`& < > ' "`) in the message body.
- Normalizes phones to `994XXXXXXXXX` format (strips `+` and separators).
- Generates a unique 32-char `controlid` per send (via `crypto.randomUUID`).
- Maps response codes to human-readable errors — e.g. `105` → "Invalid
  credentials", `118` → "Not enough units", `235` → "Invalid sender title".

The `atlTitle` is your sender name and must be pre-approved by your ATL
account manager. Only `"TEST"` is pre-approved on the sandbox account; real
deployments need a production-approved brand title to avoid response code
`235`.

## Usage from workflow actions

The `send_sms` workflow action also lives in `workflow-engine.ts` and supports
`{{field}}` template substitution from the trigger entity:

```json
{
  "actionType": "send_sms",
  "actionConfig": {
    "message": "Sorry we missed your call. — LeadDrive"
  }
}
```

For the `call.missed` trigger, `phone` is aliased to `fromNumber` so the SMS
goes back to the caller.

## What's not done yet

- **No `userId` column on `OtpCode`** — codes are scoped by `phone + purpose`
  only. Linking to a specific user is Phase 1.5 debt item (not security-
  critical right now because `verifyOtp` doesn't grant any session; callers
  are responsible for correlating phone→user).
- **No UI** — backend only. The "Enable 2FA via SMS" screen in profile
  settings is not implemented in Phase 1.
- **Not a secondary provider** — only Twilio is wired. Adding Vonage/SNS
  would live in `sendSms` as another branch.
- **Rate limit is in-memory** — on PM2 single instance this is fine. For
  multi-instance, migrate `src/lib/rate-limit.ts` to Redis first.
