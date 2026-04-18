const POSITIVE_WORDS = [
  "love", "great", "awesome", "amazing", "excellent", "thank", "best",
  "perfect", "super", "хорош", "отлично", "супер", "əla", "təşəkkür",
]
const NEGATIVE_WORDS = [
  "hate", "bad", "terrible", "worst", "awful", "broken", "sucks",
  "problem", "issue", "плохо", "ужас", "проблема", "pis", "xarab",
]

/**
 * Lexicon-based sentiment. Fast, deterministic, no network. Used as fallback.
 */
export function crudeSentiment(text: string): "positive" | "neutral" | "negative" {
  const lower = text.toLowerCase()
  let score = 0
  for (const w of POSITIVE_WORDS) if (lower.includes(w)) score++
  for (const w of NEGATIVE_WORDS) if (lower.includes(w)) score--
  if (score > 0) return "positive"
  if (score < 0) return "negative"
  return "neutral"
}

/**
 * AI sentiment classification via Anthropic SDK.
 * Returns null if the API is unreachable or the key is missing — caller should fall back to crudeSentiment.
 */
export async function aiSentiment(
  text: string,
): Promise<"positive" | "neutral" | "negative" | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  if (!text || text.length < 3) return null

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk")
    const client = new Anthropic({ apiKey })
    const truncated = text.length > 1000 ? text.slice(0, 1000) + "…" : text
    const res = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4,
      system:
        "Classify the sentiment of the text. Respond with exactly one lowercase word: positive, neutral, or negative. No punctuation.",
      messages: [{ role: "user", content: truncated }],
    })
    const out = res.content
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim()
      .toLowerCase()
    if (out === "positive" || out === "neutral" || out === "negative") return out
    return null
  } catch (e) {
    console.error("[sentiment] AI failed:", e)
    return null
  }
}

/**
 * Best-effort sentiment: AI first, crude fallback.
 */
export async function classifySentiment(text: string): Promise<"positive" | "neutral" | "negative"> {
  const ai = await aiSentiment(text)
  return ai || crudeSentiment(text)
}
