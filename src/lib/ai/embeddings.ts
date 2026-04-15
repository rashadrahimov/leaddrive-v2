import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "@/lib/prisma"

const EMBEDDING_MODEL = "voyage-3" // Anthropic's embedding model via Voyage AI
const EMBEDDING_DIMENSIONS = 1536

/**
 * Generate embedding vector for text using Voyage AI (Anthropic's embedding partner).
 * Falls back to a simple hash-based approach if Voyage is not configured.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const voyageKey = process.env.VOYAGE_API_KEY
  if (voyageKey) {
    // Use Voyage AI for high-quality embeddings
    const response = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${voyageKey}`,
      },
      body: JSON.stringify({
        model: "voyage-3-lite",
        input: [text.slice(0, 8000)], // Max input length
      }),
    })
    const data = await response.json()
    if (data.data?.[0]?.embedding) {
      return data.data[0].embedding
    }
  }

  // Fallback: use Anthropic to create a semantic hash
  // This is a workaround — generates a pseudo-embedding by asking Claude to rate relevance
  // For production, configure VOYAGE_API_KEY for real embeddings
  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 50,
    messages: [{
      role: "user",
      content: `Generate a comma-separated list of exactly 20 numbers between -1 and 1 that represent the semantic meaning of this text. Only output the numbers, nothing else.\n\nText: ${text.slice(0, 2000)}`,
    }],
  })

  const numbersText = response.content[0]?.type === "text" ? response.content[0].text : ""
  const numbers = numbersText.split(",").map(n => parseFloat(n.trim())).filter(n => !isNaN(n))

  // Pad/truncate to 1536 dimensions with deterministic hashing
  const result = new Array(EMBEDDING_DIMENSIONS).fill(0)
  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    if (i < numbers.length) {
      result[i] = numbers[i]
    } else {
      // Deterministic pseudo-random from text hash
      const charCode = text.charCodeAt(i % text.length) || 0
      result[i] = ((charCode * 2654435761) % 1000) / 1000 - 0.5
    }
  }
  return result
}

/**
 * Embed a KB article and store in the database.
 * Call this when creating or updating an article.
 */
export async function embedKbArticle(articleId: string, orgId: string, title: string, content: string): Promise<void> {
  try {
    const text = `${title}\n\n${content}`.slice(0, 8000)
    const vector = await generateEmbedding(text)

    // Upsert: update if exists, create if not
    const existing = await prisma.kbEmbedding.findUnique({ where: { articleId } })
    if (existing) {
      await prisma.$executeRawUnsafe(
        `UPDATE "kb_embeddings" SET "content" = $1, "embedding" = $2::vector, "updatedAt" = NOW() WHERE "articleId" = $3`,
        text, `[${vector.join(",")}]`, articleId
      )
    } else {
      const id = `emb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO "kb_embeddings" ("id", "organizationId", "articleId", "content", "embedding", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5::vector, NOW(), NOW())`,
        id, orgId, articleId, text, `[${vector.join(",")}]`
      )
    }
  } catch (err) {
    console.error("Failed to embed KB article:", err)
  }
}

/**
 * Search KB articles by semantic similarity.
 * Returns top N most relevant articles.
 */
export async function searchKbByVector(orgId: string, query: string, limit = 5): Promise<Array<{ articleId: string; content: string; similarity: number }>> {
  try {
    const queryVector = await generateEmbedding(query)
    const vectorStr = `[${queryVector.join(",")}]`

    const results: any[] = await prisma.$queryRawUnsafe(
      `SELECT "articleId", "content",
              1 - ("embedding" <=> $1::vector) AS similarity
       FROM "kb_embeddings"
       WHERE "organizationId" = $2
       ORDER BY "embedding" <=> $1::vector
       LIMIT $3`,
      vectorStr, orgId, limit
    )

    return results.map(r => ({
      articleId: r.articleId,
      content: r.content,
      similarity: parseFloat(r.similarity) || 0,
    }))
  } catch (err) {
    console.error("Vector search failed:", err)
    return []
  }
}

/**
 * Embed all existing KB articles for an organization.
 * Call once to backfill, then embedKbArticle() handles new/updated articles.
 */
export async function embedAllKbArticles(orgId: string): Promise<number> {
  const articles = await prisma.kbArticle.findMany({
    where: { organizationId: orgId, status: "published" },
    select: { id: true, title: true, content: true },
  })

  let count = 0
  for (const article of articles) {
    await embedKbArticle(article.id, orgId, article.title, article.content || "")
    count++
  }
  return count
}
