import { describe, it, expect } from "vitest"
import { scoreMention } from "@/lib/ai/social-viral"

describe("ai/social-viral — scoreMention", () => {
  describe("threshold passing", () => {
    it("under threshold on both reach+engagement → does not pass", () => {
      const r = scoreMention({ platform: "twitter", reach: 1000, engagement: 10, sentiment: "neutral" })
      expect(r.passes).toBe(false)
    })
    it("exactly at reach threshold → passes", () => {
      // Twitter threshold = 10k reach
      const r = scoreMention({ platform: "twitter", reach: 10000, engagement: 0, sentiment: "neutral" })
      expect(r.passes).toBe(true)
      expect(r.reachRatio).toBe(1)
    })
    it("over engagement threshold → passes even with low reach", () => {
      // Twitter engagement threshold = 200
      const r = scoreMention({ platform: "twitter", reach: 100, engagement: 500, sentiment: "neutral" })
      expect(r.passes).toBe(true)
      expect(r.engagementRatio).toBe(2.5)
    })
    it("unknown platform falls back to default thresholds (5k/100)", () => {
      const r = scoreMention({ platform: "unknown-net", reach: 5000, engagement: 0, sentiment: "neutral" })
      expect(r.passes).toBe(true)
    })
  })

  describe("sentiment multiplier", () => {
    it("negative sentiment doubles the score", () => {
      const neg = scoreMention({ platform: "twitter", reach: 20000, engagement: 400, sentiment: "negative" })
      const neu = scoreMention({ platform: "twitter", reach: 20000, engagement: 400, sentiment: "neutral" })
      expect(neg.sentimentMultiplier).toBe(2)
      expect(neu.sentimentMultiplier).toBe(1)
      expect(neg.score).toBe(neu.score * 2)
    })
    it("positive sentiment dampens (×0.7)", () => {
      const pos = scoreMention({ platform: "twitter", reach: 20000, engagement: 400, sentiment: "positive" })
      const neu = scoreMention({ platform: "twitter", reach: 20000, engagement: 400, sentiment: "neutral" })
      expect(pos.sentimentMultiplier).toBe(0.7)
      expect(pos.score).toBeCloseTo(neu.score * 0.7, 4)
    })
    it("null sentiment treated as non-neutral (×0.7)", () => {
      const r = scoreMention({ platform: "twitter", reach: 20000, engagement: 400, sentiment: null })
      expect(r.sentimentMultiplier).toBe(0.7)
    })
  })

  describe("reasons", () => {
    it("lists reach-triggered reason when reach passes", () => {
      const r = scoreMention({ platform: "instagram", reach: 5000, engagement: 10, sentiment: "neutral" })
      expect(r.reasons.some(x => x.startsWith("reach"))).toBe(true)
      expect(r.reasons.some(x => x.startsWith("engagement"))).toBe(false)
    })
    it("lists both when both pass", () => {
      const r = scoreMention({ platform: "instagram", reach: 5000, engagement: 100, sentiment: "neutral" })
      expect(r.reasons.length).toBe(2)
    })
  })
})
