import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function deriveKey(purpose) {
  const secret = process.env.NEXTAUTH_SECRET || 'ld-fallback-secret-change-me'
  const base = crypto.createHash('sha256').update(secret).digest()
  const info = Buffer.from(`leaddrive:${purpose}`, 'utf8')
  return crypto.createHmac('sha256', base).update(info).digest().slice(0, 32)
}
function base64urlDecode(s) {
  const pad = s.length % 4
  const normalized = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad ? 4 - pad : 0)
  return Buffer.from(normalized, 'base64')
}
function decryptToken(stored, purpose) {
  if (!stored.startsWith('v1:')) return stored
  const raw = base64urlDecode(stored.slice(3))
  const iv = raw.subarray(0, 12)
  const tag = raw.subarray(raw.length - 16)
  const ct = raw.subarray(12, raw.length - 16)
  const key = deriveKey(purpose)
  const d = crypto.createDecipheriv('aes-256-gcm', key, iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
}

const acc = await prisma.socialAccount.findFirst({ where: { platform: 'facebook' } })
const token = decryptToken(acc.accessToken, `oauth:facebook:${acc.handle}`)
console.log('Token (first 20):', token.slice(0, 20), '...')

const permsRes = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${token}`)
console.log('\nDebug token:', JSON.stringify(await permsRes.json(), null, 2))

const feedRes = await fetch(`https://graph.facebook.com/v21.0/${acc.handle}/feed?limit=2&access_token=${token}`)
console.log('\nFeed:', JSON.stringify(await feedRes.json(), null, 2))

await prisma.$disconnect()
