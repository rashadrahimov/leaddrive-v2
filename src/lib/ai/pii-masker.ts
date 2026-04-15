/**
 * PII Masker — masks personal data before sending to LLM, restores in response.
 *
 * Detects and masks:
 * - Email addresses → [EMAIL_1]
 * - Phone numbers → [PHONE_1]
 * - Credit card numbers → [CARD_1]
 * - IBAN / bank accounts → [IBAN_1]
 * - IP addresses → [IP_1]
 * - Tax IDs (INN/VOEN/NIP) → [TAXID_1]
 * - Known names (from CRM context) → [PERSON_1]
 * - Known company names → [COMPANY_1]
 *
 * Usage:
 *   const masker = new PiiMasker()
 *   masker.addKnownNames(["Ivan Petrov", "Sarah Johnson"])
 *   masker.addKnownCompanies(["Acme Corp", "MegaSoft"])
 *   const masked = masker.mask("Contact Ivan Petrov at ivan@company.com")
 *   // → "Contact [PERSON_1] at [EMAIL_1]"
 */

interface MaskEntry {
  placeholder: string
  original: string
}

export class PiiMasker {
  private masks: MaskEntry[] = []
  private counters: Record<string, number> = {}
  private knownNames: string[] = []
  private knownCompanies: string[] = []

  private getPlaceholder(type: string): string {
    this.counters[type] = (this.counters[type] || 0) + 1
    return `[${type}_${this.counters[type]}]`
  }

  private addMask(type: string, original: string): string {
    const existing = this.masks.find(m => m.original === original)
    if (existing) return existing.placeholder
    const placeholder = this.getPlaceholder(type)
    this.masks.push({ placeholder, original })
    return placeholder
  }

  /**
   * Register known person names from CRM data (contacts, leads).
   * These will be masked even though regex can't detect arbitrary names.
   */
  addKnownNames(names: string[]) {
    for (const name of names) {
      if (name && name.trim().length > 1) {
        this.knownNames.push(name.trim())
      }
    }
    // Sort longest first to avoid partial matches
    this.knownNames.sort((a, b) => b.length - a.length)
  }

  /**
   * Register known company names from CRM data.
   */
  addKnownCompanies(companies: string[]) {
    for (const name of companies) {
      if (name && name.trim().length > 1) {
        this.knownCompanies.push(name.trim())
      }
    }
    this.knownCompanies.sort((a, b) => b.length - a.length)
  }

  /**
   * Mask PII in text. Call before sending to LLM.
   */
  mask(text: string): string {
    if (!text) return text
    let result = text

    // 1. Known company names (before emails, since company names can contain dots)
    for (const company of this.knownCompanies) {
      if (result.includes(company)) {
        const placeholder = this.addMask("COMPANY", company)
        result = result.split(company).join(placeholder)
      }
    }

    // 2. Known person names
    for (const name of this.knownNames) {
      if (result.includes(name)) {
        const placeholder = this.addMask("PERSON", name)
        result = result.split(name).join(placeholder)
      }
    }

    // 3. Email addresses
    result = result.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      (match) => this.addMask("EMAIL", match)
    )

    // 4. Phone numbers (must start with + or have clear phone format)
    result = result.replace(
      /\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}(?:[\s.-]?\d{2,4})?/g,
      (match) => {
        const digits = match.replace(/\D/g, "")
        if (digits.length >= 7 && digits.length <= 15) {
          return this.addMask("PHONE", match)
        }
        return match
      }
    )
    // Also match parenthesized format: (555) 123-4567
    result = result.replace(
      /\(\d{3}\)\s?\d{3}[\s.-]?\d{4}/g,
      (match) => this.addMask("PHONE", match)
    )

    // 5. Credit card numbers (4 groups of 4 digits)
    result = result.replace(
      /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g,
      (match) => this.addMask("CARD", match)
    )

    // 6. IBAN
    result = result.replace(
      /\b[A-Z]{2}\d{2}\s?[\dA-Z]{4}\s?[\dA-Z]{4}\s?[\dA-Z]{4}(?:\s?[\dA-Z]{4}){0,5}\b/g,
      (match) => this.addMask("IBAN", match)
    )

    // 7. Tax IDs
    result = result.replace(
      /\b(?:ИНН|INN|VOEN|VÖEN|NIP|TIN|EIN)[\s:]*(\d{10,12})\b/gi,
      (match) => this.addMask("TAXID", match)
    )

    // 8. IP addresses (IPv4)
    result = result.replace(
      /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
      (match) => this.addMask("IP", match)
    )

    return result
  }

  /**
   * Restore original values in LLM response.
   */
  unmask(text: string): string {
    if (!text) return text
    let result = text
    const sorted = [...this.masks].sort((a, b) => b.placeholder.length - a.placeholder.length)
    for (const { placeholder, original } of sorted) {
      result = result.split(placeholder).join(original)
    }
    return result
  }

  /** Get count of masked items by type. */
  getStats(): Record<string, number> {
    return { ...this.counters }
  }

  /** Check if any PII was detected. */
  hasMaskedData(): boolean {
    return this.masks.length > 0
  }
}

/**
 * Convenience: mask text with known CRM names.
 */
export function maskPii(text: string, knownNames?: string[], knownCompanies?: string[]): { masked: string; masker: PiiMasker } {
  const masker = new PiiMasker()
  if (knownNames) masker.addKnownNames(knownNames)
  if (knownCompanies) masker.addKnownCompanies(knownCompanies)
  const masked = masker.mask(text)
  return { masked, masker }
}
