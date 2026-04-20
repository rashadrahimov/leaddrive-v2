# LeadDrive Cloudflare Workers

## email-inbound

Accepts inbound mail delivered to `*@leaddrivecrm.org` via Cloudflare Email
Routing, parses the raw MIME with PostalMime, and POSTs a JSON payload to our
Next.js API (`/api/v1/public/email-inbound`), which then creates a
`TicketComment` or logs the reply against the matching contact.

### One-time Cloudflare setup

1. Cloudflare dashboard → `leaddrivecrm.org` → **Email** → **Email Routing** → enable.
2. Confirm the MX-record replacement (overrides any previous MX).
3. **Destination addresses** → verify `support@leaddrivecrm.org` (or any other
   address you plan to use as `FALLBACK_INBOX`).
4. Install wrangler: `npm i -g wrangler` and `wrangler login`.

### Deploy

```bash
cd workers
npm init -y                     # first time only
npm install postal-mime
wrangler secret put CF_INBOUND_SECRET     # paste the same value as in the app .env
wrangler deploy email-inbound.js
```

### Bind to a catch-all

Cloudflare dashboard → **Email** → **Email Routing** → **Custom addresses** →
**Create address** → enable catch-all, action **Send to a Worker** →
`ld-email-inbound`.

### Variables

- `API_URL` — public base URL of the Next.js app (`https://app.leaddrivecrm.org`).
- `CF_INBOUND_SECRET` — shared secret with the app's `.env`.
- `FALLBACK_INBOX` (optional) — forwarded to this address if the API is
  unreachable.
