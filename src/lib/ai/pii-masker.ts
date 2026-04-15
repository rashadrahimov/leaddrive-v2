/**
 * PII Masker — masks personal data before sending to LLM, restores in response.
 *
 * Detects and masks:
 * - Email addresses → [EMAIL_1], [EMAIL_2]...
 * - Phone numbers → [PHONE_1], [PHONE_2]...
 * - Credit card numbers → [CARD_1]...
 * - IBAN / bank accounts → [IBAN_1]...
 * - IP addresses → [IP_1]...
 * - Tax IDs (INN/VOEN/NIP) → [TAXID_1]...
 *
 * Usage:
 *   const masker = new PiiMasker()
 *   const masked = masker.mask("Contact ivan@company.com at +994501234567")
 *   // → "Contact [EMAIL_1] at [PHONE_1]"
 *   const response = "Reply to [EMAIL_1] about the issue"
 *   const restored = masker.unmask(response)
 *   // → "Reply to ivan@company.com about the issue"
 */

interface MaskEntry {
  placeholder: string
  original: string
}

export class PiiMasker {
  private masks: MaskEntry[] = []
  private counters: Record<string, number> = {}

  private getPlaceholder(type: string): string {
    this.counters[type] = (this.counters[type] || 0) + 1
    return `[${type}_${this.counters[type]}]`
  }

  private addMask(type: string, original: string): string {
    // Check if already masked (same value = same placeholder)
    const existing = this.masks.find(m => m.original === original)
    if (existing) return existing.placeholder

    const placeholder = this.getPlaceholder(type)
    this.masks.push({ placeholder, original })
    return placeholder
  }

  /**
   * Mask PII in text. Call before sending to LLM.
   */
  mask(text: string): string {
    if (!text) return text
    let result = text

    // Email addresses
    result = result.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      (match) => this.addMask("EMAIL", match)
    )

    // Phone numbers (international formats)
    // +994501234567, +1-858-555-0123, +33 4 72 55 1234, (555) 123-4567
    result = result.replace(
      /(?:\+\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}(?:[\s.-]?\d{2,4})?/g,
      (match) => {
        // Only mask if looks like a real phone (7+ digits)
        const digits = match.replace(/\D/g, "")
        if (digits.length >= 7 && digits.length <= 15) {
          return this.addMask("PHONE", match)
        }
        return match
      }
    )

    // Credit card numbers (13-19 digits, possibly with spaces/dashes)
    result = result.replace(
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{1,7}\b/g,
      (match) => {
        const digits = match.replace(/\D/g, "")
        if (digits.length >= 13 && digits.length <= 19) {
          return this.addMask("CARD", match)
        }
        return match
      }
    )

    // IBAN (2 letters + 2 digits + up to 30 alphanumeric)
    result = result.replace(
      /\b[A-Z]{2}\d{2}\s?[\dA-Z]{4}\s?[\dA-Z]{4}\s?[\dA-Z]{4}(?:\s?[\dA-Z]{4}){0,5}\b/g,
      (match) => this.addMask("IBAN", match)
    )

    // Tax IDs: INN (10-12 digits), VOEN (10 digits), NIP (10 digits)
    result = result.replace(
      /\b(?:ИНН|INN|VOEN|VÖEN|NIP|TIN|EIN)[\s:]*(\d{10,12})\b/gi,
      (match) => this.addMask("TAXID", match)
    )

    // IP addresses (IPv4)
    result = result.replace(
      /\b(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g,
      (match) => this.addMask("IP", match)
    )

    // Passport numbers (common formats: 2 letters + 7 digits, or AZ + 8 digits)
    result = result.replace(
      /\b[A-Z]{2,3}\d{7,9}\b/g,
      (match) => {
        // Avoid matching invoice numbers, ticket numbers etc.
        if (/^(INV|TK|PO|SO|DO|KB|SK)\d+$/.test(match)) return match
        return this.addMask("DOCID", match)
      }
    )

    return result
  }

  /**
   * Restore original values in LLM response. Call after receiving from LLM.
   */
  unmask(text: string): string {
    if (!text) return text
    let result = text

    // Replace placeholders with originals (longest first to avoid partial matches)
    const sorted = [...this.masks].sort((a, b) => b.placeholder.length - a.placeholder.length)
    for (const { placeholder, original } of sorted) {
      result = result.split(placeholder).join(original)
    }

    return result
  }

  /**
   * Get count of masked items by type.
   */
  getStats(): Record<string, number> {
    return { ...this.counters }
  }

  /**
   * Check if any PII was detected.
   */
  hasMaskedData(): boolean {
    return this.masks.length > 0
  }
}

/**
 * Convenience function: mask text, return masked text + masker instance for later unmask.
 */
export function maskPii(text: string): { masked: string; masker: PiiMasker } {
  const masker = new PiiMasker()
  const masked = masker.mask(text)
  return { masked, masker }
}
