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
      "href", "src", "alt", "title", "class", "style",
      "target", "rel", "width", "height",
      "color", "size", "face",
    ],
    ALLOW_DATA_ATTR: false,
  })
}

export function sanitizeText(input: string): string {
  return input.replace(/[<>]/g, "")
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
