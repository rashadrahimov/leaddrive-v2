# LeadDrive Cloudflare Workers

## email-inbound

Cloudflare Email Worker that accepts every message delivered to
`*@leaddrivecrm.org` (catch-all), parses the raw MIME **inline** (no external
dependencies — works offline, no `npm install` needed), and POSTs a JSON
payload to `/api/v1/public/email-inbound` on app.leaddrivecrm.org, which then
turns the reply into a `TicketComment`.

### Production state

The worker deployed in production was uploaded via the Cloudflare API
(`PUT /accounts/{id}/workers/scripts/ld-email-inbound`). The source is this
`email-inbound.js` file — git is the source of truth.

Bindings (set in the CF dashboard or via `wrangler secret`/`wrangler.toml`):

| Name                | Type        | Example                                 |
|---------------------|-------------|-----------------------------------------|
| `API_URL`           | plain text  | `https://app.leaddrivecrm.org`          |
| `FALLBACK_INBOX`    | plain text  | `rashadrahimov@gmail.com`               |
| `CF_INBOUND_SECRET` | secret      | 64-hex-char random (must match app env) |

### Deploy updates

```bash
npm i -g wrangler          # first time only
cd workers
wrangler login             # opens browser
wrangler deploy            # uploads email-inbound.js
```

To rotate the secret:

```bash
wrangler secret put CF_INBOUND_SECRET
# paste new value — then also update /opt/leaddrive-v2/.env on the server
# and restart PM2
```

### Cloudflare Email Routing binding

Catch-all address `*@leaddrivecrm.org` → action **Send to a Worker** →
`ld-email-inbound`. This is managed via the Cloudflare Email Routing API and
should already be set for the zone; re-apply with:

```bash
curl -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE/email/routing/rules/catch_all" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled":true,"matchers":[{"type":"all"}],"actions":[{"type":"worker","value":["ld-email-inbound"]}]}'
```

### What the inline parser handles

- `text/plain`, `text/html` bodies (direct or inside `multipart/*`)
- `Content-Transfer-Encoding: base64` and `quoted-printable`
- MIME-encoded `Subject:` headers (`=?UTF-8?B?...?=`, `=?UTF-8?Q?...?=`)
- Nested multipart (one level — covers Gmail/Outlook replies with
  `multipart/alternative` inside `multipart/mixed`)

### What the parser does **not** handle

- Attachments (dropped — we don't POST binary)
- Deeply nested multipart (>1 level inner)
- Unknown charsets (best-effort `TextDecoder`)
- Malformed MIME without proper `Content-Type` (falls back to treating the
  whole body as text/plain — good enough for the catch-all use case)

For 95%+ of replies from Gmail, Outlook, Apple Mail this is sufficient.
