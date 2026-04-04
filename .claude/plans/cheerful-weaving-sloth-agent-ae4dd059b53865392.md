# План: Честное сравнение CRM-платформ — LeadDrive v2 vs Конкуренты

## Результат аудита кода

Перед написанием документа проведён аудит кодовой базы LeadDrive v2:

- **96 страниц** в dashboard — полноценное приложение
- **2719 строк** в Prisma schema — богатая модель данных
- **15 файлов** используют Anthropic SDK — AI реально интегрирован
- **Workflow engine** работает с 6 типами сущностей
- **Webhooks**: WhatsApp, Telegram, Facebook, VKontakte
- **TypeScript strict: true** (коррекция — пользователь указал disabled, но это не так)
- **247 обходов** `as any`/`@ts-ignore` в 102 файлах
- **0 тестов** — ни одного .test.* или .spec.* файла
- **Agent Desktop** = дашборд с метриками, не инструмент агента
- **Нет SSO/LDAP, нет мобильного приложения, нет marketplace** — подтверждено

## Структура выходного документа

Создать файл: `docs/crm-comparison-audit-2026.md`

Документ на русском языке, markdown, содержит разделы:

1. **Резюме** — таблица 5 платформ с честным вердиктом
2. **Методология** — шкала 1-5 баллов
3. **Функциональное сравнение** (8 категорий с таблицами):
   - 3.1 Sales & CRM
   - 3.2 Маркетинг
   - 3.3 Поддержка клиентов
   - 3.4 Коммуникации
   - 3.5 AI и автоматизация
   - 3.6 Аналитика и финансы (главная победа LeadDrive)
   - 3.7 Платформа и расширяемость (главное поражение)
   - 3.8 Специализированные модули
4. **Сравнение цен** — TCO для 5/25/100 пользователей
5. **Матрица побед и поражений**
6. **SWOT-анализ**
7. **Позиционирование и рекомендации**

## Ключевые находки для документа

### Где LeadDrive РЕАЛЬНО выигрывает:
- Финансовый блок (Cost Model + Budgeting + P&L) — уникально среди CRM
- MTM (полевые агенты с GPS) — уникальный модуль
- Цена при 25+ пользователях
- СНГ-мессенджеры (Telegram/VK)
- Self-hosted + all-in-one

### Где LeadDrive РЕАЛЬНО проигрывает:
- AI: поверхностный (кроме скоринга) vs Agentforce/Creatio AI
- Экосистема: 0 интеграций vs 2000+ (Salesforce)
- Мобильное приложение: нет
- No-code: нет vs Creatio (лидер Forrester)
- Enterprise: нет SSO, нет LDAP, нет SOC2
- Качество кода: 0 тестов, 247 обходов strict
- Масштабируемость: single-tenant VDS

### Коррекции к данным пользователя:
- TypeScript strict: **true** (не disabled) — но 247 `as any`
- 0 тестов — критическая находка для аудита
- Agent Desktop — дашборд, не полноценный инструмент

## Приоритеты развития (из документа):
1. P0: Мобильное приложение (PWA)
2. P0: Автотесты
3. P1: SSO/LDAP
4. P1: Углубить AI
5. P2: API документация
6. P2: Marketplace

## Critical Files for Implementation
- /Users/rashadrahimov/Documents/leaddrive-v2/docs/ (создать crm-comparison-audit-2026.md)
- /Users/rashadrahimov/Documents/leaddrive-v2/prisma/schema.prisma (модель данных для аудита)
- /Users/rashadrahimov/Documents/leaddrive-v2/src/app/api/v1/ai/route.ts (AI-реализация)
- /Users/rashadrahimov/Documents/leaddrive-v2/src/lib/workflow-engine.ts (автоматизация)
- /Users/rashadrahimov/Documents/leaddrive-v2/package.json (зависимости и версии)
