# LeadDrive CRM v2 — Project Context for Claude Code

> Architecture, stack, dev commands → `docs/ARCHITECTURE.md`
> Deploy procedure, server details, build notes → `docs/DEPLOYMENT.md`
> Rate-limit coverage map + known gaps → `docs/rate-limit-policy.md`

## User Preferences

- Language: Russian (communication), English (code/commits)
- Style: "не мухлюй!" — be thorough, don't skip anything
- Commits: detailed messages with what was done
- Testing: user tests on app.leaddrivecrm.org

## КРИТИЧНО: Защита UI дизайна

- **НИКОГДА** не удалять, перемещать или заменять UI компоненты/секции без ЯВНОГО подтверждения пользователя
- Перед изменением layout — читать `docs/budgeting-layout.md` (и аналогичные файлы для других страниц)
- Если изменение затрагивает удаление/перемещение элементов — СНАЧАЛА уведомить и получить подтверждение
- После деплоя — проверять на production через Chrome MCP что ВСЕ секции из документации на месте
- **Reason**: ранее при рефакторинге терялись компоненты (waterfall, bar charts, alerts) — пользователь ловил баги после деплоя

## КРИТИЧНО: Деплой — ВСЕГДА спрашивать куда

- ПЕРЕД ЛЮБЫМ деплоем — спросить: "На какого клиента деплоим?"
- Прочитать `clients/registry.json`, показать список клиентов
- Варианты: конкретный клиент (`deploy acme`), все (`deploy-all`), или "только LeadDrive"
- **НИКОГДА** не деплоить без явного подтверждения, на какой сервер
- **НИКОГДА** не предполагать что деплой идёт на LeadDrive по умолчанию
- **Reason**: несколько клиентских серверов, ошибочный деплой ломает прод клиента

## КРИТИЧНО: Static files в standalone билде (баг 11.04.2026)

После `npx next build --webpack` ОБЯЗАТЕЛЬНО:
```bash
cp -r .next/static .next/standalone/.next/static
cp -r public/* .next/standalone/public/
```

- `public/*` **со звёздочкой** — без неё создаётся вложенная `public/public/` и файлы типа leaflet.css не находятся
- Без этого dashboard будет **ПУСТОЙ** (JS/CSS вернут 503, React не гидратируется)
- Без `public/*` — карты сломаются (leaflet.css не загрузится)
- Путь `.next/standalone/.next/static` — БЕЗ вложенной `leaddrive-v2/` (Next.js 16 её не создаёт)
- Smoke-check: `curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/_next/static/chunks/webpack-*.js` → должен вернуть 200

## Multi-Client Deployments

- **Architecture**: одна ветка (`main`), кастомизация через БД (`Organization.features` + `Organization.branding`)
- **Registry**: `clients/registry.json` — ВСЕГДА читай перед деплоем
- **Management**: `bash scripts/client.sh <cmd>` — commands:
  - `list` — список клиентов
  - `status` — health check всех серверов
  - `deploy <name>` — деплой конкретному клиенту
  - `deploy-all` — деплой всем активным (для баг-фиксов)
  - `logs <name>` — PM2 логи клиента
  - `ssh <name>` — SSH на сервер клиента
  - `create <name> --server=IP --domain=DOMAIN` — добавить нового клиента
- **Custom features**: через `Organization.features` JSON в БД (не ветки!)
- **Branding**: через `Organization.branding` JSON в БД (logo, colors, companyName)

## Database

- Prod psql: ОБЯЗАТЕЛЬНО `-h localhost` (peer auth fails without it)
- Schema changes: `npx prisma generate` + `npx prisma migrate deploy` на сервере

## graphify

This project has a graphify knowledge graph at `graphify-out/`.

- Before answering architecture or codebase questions, read `graphify-out/GRAPH_REPORT.md` for god nodes and community structure
- If `graphify-out/wiki/index.md` exists, navigate it instead of reading raw files
- After modifying code files in this session, run:
  ```bash
  python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"
  ```

## Context Navigation

1. ALWAYS query the knowledge graph first
2. Only read raw files if the user explicitly says so
3. Use `graphify-out/wiki/index.md`
