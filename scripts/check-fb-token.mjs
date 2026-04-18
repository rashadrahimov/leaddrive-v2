import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function deriveKey(purpose) {
  const secret = process.env.NEXTAUTH_SECRET || 'ld-fallback-secret-change-me'
  const base = crypto.createHash('sha256').update(secret).digest()
  return crypto.createHmac('sha256', base).update(Buffer.from(`leaddrive:${purpose}`, 'utf8')).digest().slice(0, 32)
}
function base64urlDecode(s) {
  const pad = s.length % 4
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad ? 4 - pad : 0), 'base64')
}
function decryptToken(stored, purpose) {
  if (!stored.startsWith('v1:')) return stored
  const raw = base64urlDecode(stored.slice(3))
  const d = crypto.createDecipheriv('aes-256-gcm', deriveKey(purpose), raw.subarray(0, 12))
  d.setAuthTag(raw.subarray(raw.length - 16))
  return Buffer.concat([d.update(raw.subarray(12, raw.length - 16)), d.final()]).toString('utf8')
}

const acc = await prisma.socialAccount.findFirst({ where: { platform: 'facebook', displayName: 'Nokaut.az' } })
const token = decryptToken(acc.accessToken, `oauth:facebook:${acc.handle}`)

// What type of token is this?
const debugRes = await fetch(`https://graph.facebook.com/v21.0/debug_token?input_token=${token}&access_token=${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`)
const debugJson = await debugRes.json()
console.log('Debug:', JSON.stringify(debugJson.data, null, 2))

// /me — should return page identity if it's a page token
const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${token}`)
console.log('\n/me:', JSON.stringify(await meRes.json(), null, 2))

await prisma.$disconnect()
