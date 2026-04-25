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

### КРИТИЧНО: Prisma engine в standalone (баг 21.04.2026)

`serverExternalPackages: ["@prisma/client", ".prisma/client"]` в `next.config.ts` означает что
Next.js НЕ трейсит Prisma в standalone. Без дополнительного копирования
`libquery_engine-<platform>.so.node` **все DB-запросы упадут** с
`PrismaClientInitializationError: Query Engine not found`.

Что уже сделано:
- `next.config.ts` → `outputFileTracingIncludes` для `/api/**` включает engine + schema
- `scripts/server-deploy.sh` после extract проверяет `libquery_engine-*.so.node` и копирует из host `node_modules` если отсутствует
- Новый `/api/v1/ping` делает `prisma.organization.count()` → health-check hit: 200 = OK, 500 = engine missing → auto-rollback

Manual deploy (если без CI):
```bash
cp -r node_modules/.prisma .next/standalone/node_modules/.prisma
cp -r node_modules/@prisma .next/standalone/node_modules/@prisma
curl -s http://localhost:3001/api/v1/ping  # должно вернуть {"ok":true,"db":"ok"}
```

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
  python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))" \
    && python3 scripts/graphify-fix-collapsed-handlers.py
  ```
  The fix-script splits Next.js convention handlers (`route.ts`, `page.tsx`, `layout.tsx`) that graphify's AST extractor otherwise collapses into single god nodes (POST/GET/etc with hundreds of false-bridge edges). Required after every rebuild until graphify upstream namespaces by parent dir.

## Context Navigation

1. ALWAYS query the knowledge graph first
2. Only read raw files if the user explicitly says so
3. Use `graphify-out/wiki/index.md`

## Roles & workflow (read before acting)

Four roles operate on this codebase; a new Claude session MUST understand
them before writing code. Both developer and architect are Claude
instances in the same Claude Code environment — there is no external model.

| Role | Identity | Tools | Does | Does NOT |
|---|---|---|---|---|
| **User** | Human (Rashad) | N/A | Strategic scope, ship/cut decisions, real-world context, approves deferrals | Write code |
| **Developer** | Main Claude in the session | Full (Read/Write/Edit/Bash/...) | Writes code, runs tests / tsc / migrations / deploy scripts, makes tactical architecture calls autonomously, announces next step, never votes | Decide ship/cut unilaterally; silently defer promised work |
| **Architect subagent** | Claude via `Agent` tool with `subagent_type: "architect"` | Read-only (Read/Grep/Glob/Bash) | Reviews changes: scope audit vs declared TurnGoal + quality review (Проблемы/Предложения). Catches drift, silent deferrals, security regressions, architectural gaps | Write or edit files |
| **Explore subagent** | Claude via `Agent` tool with `subagent_type: "Explore"` | Read-only | On-demand codebase searches, honest audits spanning many files | Write or edit files |

### Turn flow

1. User gives direction OR developer continues per agreed plan.
2. Developer declares **TurnGoal** at start of any substantive turn
   (substantive = produces any git diff OR writes to `memory/`; TodoWrite
   alone doesn't count). Pure Q&A / planning turns are exempt.
3. Developer executes, runs the usual local checks (`npx tsc --noEmit`,
   `npm run test`, `npx prisma migrate dev`, etc.).
4. **Stop hook** (`.claude/hooks/architect-gate.sh`, triggered only when
   `.claude/hooks/mark-dirty.sh` marked the turn) blocks turn close and
   forces the developer to invoke the architect subagent. Non-substantive
   turns (no Edit/Write/MultiEdit use) pass through without review.
5. Architect prompt has two required sections:
   - **Scope check:** TurnGoal verbatim → architect verifies each goal
     landed in diff, flags silent drops / undeclared deferrals /
     retro-scope-creep.
   - **Quality review:** Проблемы / Предложения on what was built.
6. Architect's reply — both sections — is quoted **verbatim** in the final
   user-facing message (pass-through identical whether scope is clean or
   not; user always sees the audit happened).
7. Any Problem from either section triggers **fix-before-build** (see
   `memory/feedback_fix_before_build.md`) — turn cannot close until the
   issue is resolved or the developer explicitly escalates to the user
   for cut/defer approval (in the final assistant message, not in a
   ROADMAP comment).
8. Turn ends with developer announcing the next step as a fact, not a
   question (see `memory/feedback_decide_next_step.md`).

### How developer invokes subagents

```
Agent(subagent_type="architect", description="...", prompt="...")
Agent(subagent_type="Explore",   description="...", prompt="...")
```

Architect runs after every substantive turn (mechanically via stop hook).
Explore is on-demand for cross-file audits. Neither can write files.

### Durable protocol files

Persisted in `memory/` and auto-loaded at session start. `memory/MEMORY.md`
is the index — each line is a markdown link pointing at a feedback /
project / reference memory file. A new Claude traverses those links when
the topic comes up, not up-front.

Core protocol files (must exist; if absent, re-copy from the protocol
template or from any other project that has them — they are intentionally
project-agnostic):

- `feedback_fix_before_build.md` — close review findings before new work
- `feedback_decide_next_step.md` — don't ask, announce
- `feedback_architect_scope_audit.md` — TurnGoal + double-audit protocol

LeadDrive-specific feedback / project memories are enumerated in
`MEMORY.md` (deploy, multi-client, branding, i18n, etc. — keep as-is).

### Operational gotchas

- **Start Claude sessions from the repo root.** The stop / dirty hooks in
  `.claude/settings.json` use relative paths (`.claude/hooks/...`); if the
  session CWD is a sub-directory, the hooks fire-and-fail silently and the
  architect-gate is effectively disabled.
- **Architect subagent should consult `graphify-out/`.** Before wading into
  the codebase, architect reads `graphify-out/GRAPH_REPORT.md` (god nodes,
  community structure) and `graphify-out/wiki/index.md` if present —
  cheaper than blind grep on a large project. The subagent definition in
  `.claude/agents/architect.md` already carries this instruction.
