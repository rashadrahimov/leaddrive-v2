import DOMPurify from "isomorphic-dompurify"
import { z } from "zod"

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: ["b", "i", "em", "strong"] })
}

/** Rich HTML sanitizer for KB articles, email templates, and previews */
export function sanitizeRichHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "ul", "ol", "li",
      "strong", "em", "b", "i", "u", "s", "del",
      "a", "img",
      "blockquote", "pre", "code",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span", "font",
    ],
    ALLOWED_ATTR: [
      "href", "src", "alt", "title",
      "target", "rel", "width", "height",
      "color", "size", "face",
    ],
    ALLOW_DATA_ATTR: false,
  })
}

export function sanitizeText(input: string): string {
  return input.replace(/[<>]/g, "")
}

/** Sanitize user data before injecting into AI system prompts.
 *  Strips newlines, control characters, and caps length to prevent prompt injection. */
export function sanitizeForPrompt(input: string, maxLength = 100): string {
  return input
    .replace(/[\r\n\t]/g, " ")       // strip newlines/tabs
    .replace(/[\x00-\x1f\x7f]/g, "") // strip control characters
    .trim()
    .slice(0, maxLength)
}

/** Strip newlines and ANSI escape codes from strings before logging */
export function sanitizeLog(input: string): string {
  return input.replace(/[\n\r]/g, " ").replace(/\x1b\[[0-9;]*m/g, "").substring(0, 1000)
}

// Common sanitized Zod schemas
export const sanitizedStringSchema = z
  .string()
  .max(500)
  .transform((val) => sanitizeText(val))

export const sanitizedHtmlSchema = z
  .string()
  .max(5000)
  .transform((val) => sanitizeHtml(val))

export const sanitizedEmailSchema = z
  .string()
  .email()
  .toLowerCase()
  .transform((val) => sanitizeText(val))

export const contactSchema = z.object({
  firstName: sanitizedStringSchema,
  lastName: sanitizedStringSchema,
  email: sanitizedEmailSchema,
  phone: sanitizedStringSchema.optional(),
  notes: sanitizedHtmlSchema.optional(),
})

export const dealSchema = z.object({
  name: sanitizedStringSchema,
  description: sanitizedHtmlSchema.optional(),
  value: z.number().positive(),
})
