import DOMPurify from "isomorphic-dompurify"
import { z } from "zod"

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: ["b", "i", "em", "strong"] })
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
