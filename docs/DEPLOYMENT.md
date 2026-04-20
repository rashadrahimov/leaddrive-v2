# LeadDrive CRM v2 — Deployment

## Production (LeadDrive on Hetzner VDS)

- Marketing: `leaddrivecrm.org`
- CRM app: `app.leaddrivecrm.org` (port 3001 via PM2)
- App directory: `/opt/leaddrive-v2`
- PM2 process: `leaddrive-v2`
- SSH: `root@46.224.171.53`
- GitHub: `rashadrahimov/leaddrive-v2`, branch `main`

> For multi-client deploy behavior see the rule block in `CLAUDE.md` ("Деплой — ВСЕГДА спрашивать куда") and `clients/registry.json`.

## One-command deploy

```bash
bash scripts/deploy.sh
```

Script flow:
1. Local build check (catches errors BEFORE deploy)
2. Push to GitHub
3. Pull on server
4. Build on server with `--webpack` (Turbopack doesn't produce standalone)
5. Copy static files into standalone (see CLAUDE.md for the static-files rule)
6. Restart PM2 + health check

## Manual deploy (fallback if script fails)

```bash
git push origin main
ssh -i ~/.ssh/id_ed25519 root@46.224.171.53 "cd /opt/leaddrive-v2 && git pull origin main && npx prisma generate && npx next build --webpack && cp -r .next/static .next/standalone/.next/static && cp -r public/* .next/standalone/public/ && pm2 restart leaddrive-cloud"
```

## Verify after deploy

```bash
ssh -i ~/.ssh/id_ed25519 root@46.224.171.53 "pm2 status && curl -s -o /dev/null -w '%{http_code}' http://localhost:3001"
ssh -i ~/.ssh/id_ed25519 root@46.224.171.53 "pm2 logs leaddrive-v2 --lines 20 --nostream"
```

## Build notes

- PM2 runs `.next/standalone/server.js` via `/tmp/start-leaddrive.sh`
- Start script: `source .env → cd .next/standalone → node server.js`
- Next.js 16 Turbopack does NOT create `standalone` — must build with `--webpack`
- `output: "standalone"` in `next.config.ts` (webpack creates it, turbopack doesn't)
- If server doesn't respond >30 seconds → ask user to restart
- Schema changes: `npx prisma generate` + `npx prisma migrate deploy` on server

## SSL

Certificates active until July 2026 (auto-renew via certbot).

## Error tracking

Sentry integrated — set `SENTRY_DSN` in `.env`.
