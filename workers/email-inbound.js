// Cloudflare Email Worker for LeadDrive CRM — parses inbound MIME inline and
// POSTs the result to /api/v1/public/email-inbound. No external dependencies
// so we can upload via the Workers Scripts API in a single PUT.

export default {
  async email(message, env) {
    const rawText = await readAsUtf8(message.raw, message.rawSize)
    const parsed = parseBasicMime(rawText)

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
      if (!res.ok && env.FALLBACK_INBOX) {
        await message.forward(env.FALLBACK_INBOX)
      }
    } catch (_e) {
      if (env.FALLBACK_INBOX) {
        try { await message.forward(env.FALLBACK_INBOX) } catch {}
      }
    }
  },
}

async function readAsUtf8(stream, _size) {
  const reader = stream.getReader()
  const chunks = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
  }
  const total = chunks.reduce((n, c) => n + c.length, 0)
  const merged = new Uint8Array(total)
  let off = 0
  for (const c of chunks) { merged.set(c, off); off += c.length }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged)
}

function parseBasicMime(raw) {
  const split = raw.indexOf("\r\n\r\n") >= 0 ? raw.indexOf("\r\n\r\n") : raw.indexOf("\n\n")
  if (split < 0) return { subject: "", text: raw, html: "", messageId: "", inReplyTo: "" }
  const headersRaw = raw.slice(0, split)
  const bodyRaw = raw.slice(split).replace(/^\r?\n\r?\n/, "")

  const headers = parseHeaders(headersRaw)
  const ct = headers["content-type"] || "text/plain"
  const cte = (headers["content-transfer-encoding"] || "").toLowerCase()

  let text = "", html = ""

  if (ct.startsWith("multipart")) {
    const boundary = extractBoundary(ct)
    if (boundary) {
      const parts = bodyRaw.split(`--${boundary}`)
      for (const part of parts) {
        if (!part.trim()) continue
        const psplit = part.indexOf("\r\n\r\n") >= 0 ? part.indexOf("\r\n\r\n") : part.indexOf("\n\n")
        if (psplit < 0) continue
        const phRaw = part.slice(0, psplit)
        const pBody = part.slice(psplit).replace(/^\r?\n\r?\n/, "")
        const ph = parseHeaders(phRaw)
        const pct = ph["content-type"] || ""
        const pcte = (ph["content-transfer-encoding"] || "").toLowerCase()
        if (pct.startsWith("text/plain") && !text) {
          text = decodeBody(pBody.trim(), pcte)
        } else if (pct.startsWith("text/html") && !html) {
          html = decodeBody(pBody.trim(), pcte)
        } else if (pct.startsWith("multipart") && !text && !html) {
          const inner = parseBasicMime("content-type: " + pct + "\r\n\r\n" + pBody)
          if (inner.text) text = inner.text
          if (inner.html) html = inner.html
        }
      }
    }
  } else if (ct.startsWith("text/html")) {
    html = decodeBody(bodyRaw, cte)
  } else {
    text = decodeBody(bodyRaw, cte)
  }

  return {
    subject: decodeMimeHeader(headers["subject"] || ""),
    text: (text || "").trim(),
    html: (html || "").trim(),
    messageId: headers["message-id"] || "",
    inReplyTo: headers["in-reply-to"] || "",
  }
}

function parseHeaders(raw) {
  const unfolded = raw.replace(/\r?\n[\t ]+/g, " ")
  const out = {}
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":")
    if (idx > 0) {
      const k = line.slice(0, idx).toLowerCase().trim()
      out[k] = line.slice(idx + 1).trim()
    }
  }
  return out
}

function extractBoundary(ct) {
  const m = ct.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)
  return m ? (m[1] || m[2]) : null
}

function decodeBody(body, cte) {
  if (cte === "base64") {
    try { return atob(body.replace(/\s+/g, "")) } catch { return body }
  }
  if (cte === "quoted-printable") {
    return body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  }
  return body
}

function decodeMimeHeader(h) {
  return h.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, charset, enc, txt) => {
    if (enc.toLowerCase() === "b") {
      try { return new TextDecoder(charset).decode(base64ToBytes(txt)) } catch { return txt }
    }
    const decoded = txt.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    try { return new TextDecoder(charset).decode(Uint8Array.from(decoded, c => c.charCodeAt(0))) } catch { return decoded }
  })
}

function base64ToBytes(b64) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}
