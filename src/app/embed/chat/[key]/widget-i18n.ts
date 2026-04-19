// Minimal i18n dictionary for the embeddable widget.
// Covers the 3 UI strings visible to visitors.

export type WidgetLang = "en" | "ru" | "az"

export const WIDGET_TRANSLATIONS: Record<WidgetLang, Record<string, string>> = {
  en: {
    nameOptional: "Your name (optional)",
    emailOptional: "Email (optional)",
    phoneOptional: "Phone (optional)",
    startChat: "Start chat",
    starting: "Starting…",
    typeMessage: "Type a message…",
    attachFile: "Attach file",
    agentTyping: "agent is typing…",
    uploadFailed: "Upload failed",
  },
  ru: {
    nameOptional: "Ваше имя (необязательно)",
    emailOptional: "Email (необязательно)",
    phoneOptional: "Телефон (необязательно)",
    startChat: "Начать чат",
    starting: "Запуск…",
    typeMessage: "Введите сообщение…",
    attachFile: "Прикрепить файл",
    agentTyping: "оператор печатает…",
    uploadFailed: "Не удалось загрузить файл",
  },
  az: {
    nameOptional: "Adınız (istəyə bağlı)",
    emailOptional: "Email (istəyə bağlı)",
    phoneOptional: "Telefon (istəyə bağlı)",
    startChat: "Çatı başlat",
    starting: "Başlayır…",
    typeMessage: "Mesajınızı yazın…",
    attachFile: "Fayl əlavə et",
    agentTyping: "operator yazır…",
    uploadFailed: "Yükləmə alınmadı",
  },
}

export function resolveWidgetLang(raw: unknown): WidgetLang {
  const v = String(raw || "").toLowerCase().slice(0, 2)
  if (v === "ru" || v === "az") return v
  return "en"
}

export function t(lang: WidgetLang, key: string): string {
  return WIDGET_TRANSLATIONS[lang]?.[key] ?? WIDGET_TRANSLATIONS.en[key] ?? key
}
