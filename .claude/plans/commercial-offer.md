# Коммерческие предложения в сделках (v2)

## Что делаем
Добавляем возможность создавать и отправлять коммерческие предложения (КП) прямо из карточки сделки — как в v1, но интегрировано в v2 архитектуру.

## Что было в v1
- Отдельная страница `/offers` со списком КП
- Типы: Коммерческое, Счёт-фактура, Оборудование, Услуги
- Клиент из CRM или вручную, VÖEN, контактное лицо
- Позиции (услуги/товары): название, кол-во, цена за ед., скидка %, итого
- PDF генерация
- Email отправка
- Статусы: Черновик → Отправлено → Утверждено

## План реализации

### Шаг 1: Расширить Prisma схему

**Обновить модель `Offer`** — добавить связь с Deal, позиции, email-трекинг:

```prisma
model Offer {
  // существующие поля...
  dealId         String?          // ← NEW: привязка к сделке
  deal           Deal?            @relation(fields: [dealId], references: [id])
  contactId      String?          // ← NEW: контактное лицо
  type           String           @default("commercial") // commercial, invoice, equipment, services
  voen           String?          // ← NEW: VÖEN клиента
  discount       Float?           @default(0) // общая скидка
  sentAt         DateTime?        // ← NEW: когда отправлено
  recipientEmail String?          // ← NEW: кому отправлено
  items          OfferItem[]      // ← NEW: позиции
}

model OfferItem {
  id          String  @id @default(cuid())
  offerId     String
  offer       Offer   @relation(fields: [offerId], references: [id], onDelete: Cascade)
  name        String
  quantity    Int     @default(1)
  unitPrice   Float   @default(0)
  discount    Float   @default(0)  // скидка в %
  total       Float   @default(0)
  sortOrder   Int     @default(0)

  @@index([offerId])
  @@map("offer_items")
}
```

**Добавить в Deal** relation `offers Offer[]`.

### Шаг 2: API маршруты

1. **`POST /api/v1/deals/[id]/offers`** — создать КП привязанное к сделке (автозаполнение из сделки: компания, контакт, валюта, сумма)
2. **`GET /api/v1/deals/[id]/offers`** — список КП сделки
3. **`PUT /api/v1/offers/[id]`** — обновить КП (существует, расширить)
4. **`POST /api/v1/offers/[id]/send`** — отправить КП по email (используя `sendEmail()` из `src/lib/email.ts`)
5. **`GET /api/v1/offers/[id]/pdf`** — генерация PDF

### Шаг 3: Новый таб "Предложения" на странице сделки

Добавить таб **"Təkliflər"** (Предложения) между "Komanda" и "Əlaqə" в `deals/[id]/page.tsx`:

- Список КП привязанных к сделке (таблица: №, тип, сумма, статус, дата)
- Кнопка "Yeni təklif" — открывает модалку создания
- Действия: Редактировать, Скачать PDF, Отправить email, Удалить

### Шаг 4: Модалка создания/редактирования КП

**OfferForm** — диалоговое окно:
- Тип предложения (dropdown): Коммерческое, Счёт-фактура, Оборудование, Услуги
- Валюта (из сделки, можно сменить)
- Клиент (автозаполнение из сделки)
- VÖEN
- Контактное лицо (из contact roles сделки)
- Действителен до (дата)
- Примечания
- **Таблица позиций**: + Добавить позицию → название, кол-во, цена за ед., скидка %, итого (авто-расчёт)
- Итого без скидки / Скидка / ИТОГО

### Шаг 5: Отправка email

**SendOfferDialog** — модалка отправки:
- Email получателя (автозаполнение из контакта)
- Тема письма (шаблон: "Коммерческое предложение №{offerNumber}")
- Текст письма (с переменными: {{company}}, {{contact}}, {{amount}}, {{validUntil}})
- Опционально: выбрать email-шаблон
- Кнопка "Отправить" → вызов `POST /api/v1/offers/[id]/send`
- После отправки: статус КП → "sent", sentAt обновляется

### Шаг 6: PDF генерация (упрощённая)

Используем `@react-pdf/renderer` или HTML→PDF через API:
- Шапка: логотип компании, название, адрес
- Данные: клиент, VÖEN, контактное лицо, дата, номер КП
- Таблица позиций
- Итого
- Подпись

### Шаг 7: i18n

Добавить переводы в `en.json`, `ru.json`, `az.json`:
- offers.title, offers.new, offers.type, offers.send, offers.pdf, offers.status.*
- offers.commercial, offers.invoice, offers.equipment, offers.services

## Файлы которые будут затронуты

1. `prisma/schema.prisma` — Offer + OfferItem модели
2. `src/app/(dashboard)/deals/[id]/page.tsx` — новый таб
3. `src/components/deals/OfferForm.tsx` — NEW: форма создания/редактирования
4. `src/components/deals/OffersTab.tsx` — NEW: содержимое таба
5. `src/components/deals/SendOfferDialog.tsx` — NEW: модалка отправки
6. `src/app/api/v1/deals/[id]/offers/route.ts` — NEW: CRUD
7. `src/app/api/v1/offers/[id]/send/route.ts` — NEW: отправка email
8. `src/app/api/v1/offers/[id]/pdf/route.ts` — NEW: PDF генерация
9. `messages/en.json`, `messages/ru.json`, `messages/az.json` — переводы

## Порядок выполнения

1. Schema + migration
2. API routes (CRUD + send)
3. OffersTab + OfferForm компоненты
4. SendOfferDialog
5. i18n
6. PDF (можно отложить на следующий этап)
7. Build + deploy + тест
