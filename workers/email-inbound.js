// Cloudflare Email Worker — receives inbound mail for *@leaddrivecrm.org and
// forwards a parsed JSON payload to our Next.js API. Deploy via wrangler:
//
//   cd workers && wrangler deploy email-inbound.js
//
// or paste into the Cloudflare dashboard → Workers & Pages → "ld-email-inbound".
//
// Required environment variables (set in CF dashboard → Worker → Variables):
//   API_URL            e.g. "https://app.leaddrivecrm.org"
//   CF_INBOUND_SECRET  shared secret that matches the same env on our Next.js API
//   FALLBACK_INBOX     e.g. "support@leaddrivecrm.org" — used if the API is down
//
// Compatible with Cloudflare Email Routing's catch-all to Worker action.
// Uses PostalMime for MIME parsing (bundled at build time with wrangler).

import PostalMime from "postal-mime"

export default {
  /**
   * @param {EmailMessage} message
   * @param {{ API_URL: string, CF_INBOUND_SECRET: string, FALLBACK_INBOX?: string }} env
   */
  async email(message, env) {
    const rawStream = message.raw
    const rawBuffer = await streamToArrayBuffer(rawStream, message.rawSize)

    let parsed
    try {
      parsed = await PostalMime.parse(rawBuffer)
    } catch (e) {
      console.error("[ld-email-inbound] parse failed:", e)
      if (env.FALLBACK_INBOX) {
        await message.forward(env.FALLBACK_INBOX)
      }
      return
    }

    const payload = {
      to: message.to,
      from: message.from,
      subject: parsed.subject || "",
      text: parsed.text || "",
      html: parsed.html || "",
      messageId: parsed.messageId || "",
      inReplyTo: parsed.inReplyTo || "",
    }

    try {
      const res = await fetch(`${env.API_URL}/api/v1/public/email-inbound`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CF-Inbound-Secret": env.CF_INBOUND_SECRET,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        console.error(
          `[ld-email-inbound] api returned ${res.status}: ${await res.text()}`,
        )
        if (env.FALLBACK_INBOX) {
          await message.forward(env.FALLBACK_INBOX)
        }
      }
    } catch (e) {
      console.error("[ld-email-inbound] fetch error:", e)
      if (env.FALLBACK_INBOX) {
        await message.forward(env.FALLBACK_INBOX)
      }
    }
  },
}

async function streamToArrayBuffer(stream, size) {
  const reader = stream.getReader()
  const chunks = []
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (received > size) break
  }
  const merged = new Uint8Array(received)
  let off = 0
  for (const c of chunks) {
    merged.set(c, off)
    off += c.length
  }
  return merged.buffer
}
