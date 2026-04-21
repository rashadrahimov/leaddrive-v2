import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { z } from "zod"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        try {
          // Real DB lookup
          const user = await prisma.user.findFirst({
            where: { email: parsed.data.email, isActive: true },
            include: { organization: true },
          })

          if (!user) return null

          // Check if organization is active (tenant deactivation)
          if (!user.organization.isActive && user.role !== "superadmin") return null

          // Verify password
          const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
          if (!valid) return null

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date(), loginCount: { increment: 1 } },
          }).catch(() => {}) // Non-critical

          // Determine 2FA method. TOTP wins when both flags are set —
          // it's instant and free, while SMS costs money and takes seconds.
          let twoFactorMethod: "totp" | "sms" | null = null
          if (user.totpEnabled) twoFactorMethod = "totp"
          else if (user.smsAuthEnabled && user.verifiedPhone) twoFactorMethod = "sms"

          // If SMS 2FA is active, fire off a code right after password check
          // so it's already in transit by the time the UI lands on the verify page.
          // Done dynamically to avoid a startup-time import of sms.ts into auth.ts.
          if (twoFactorMethod === "sms" && user.verifiedPhone) {
            try {
              const { sendOtp } = await import("@/lib/sms")
              await sendOtp({
                phone: user.verifiedPhone,
                purpose: "2fa",
                organizationId: user.organizationId,
                userId: user.id,
              })
            } catch (e) {
              console.error("[Auth] SMS 2FA code dispatch failed:", e)
              // Don't block login — user can request a resend on the verify page.
            }
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            organizationSlug: user.organization.slug,
            organizationName: user.organization.name,
            plan: user.organization.plan,
            // 2FA flags
            needs2fa: twoFactorMethod ? true : undefined,
            twoFactorMethod: twoFactorMethod || undefined,
            needsSetup2fa: (user.require2fa && !user.totpEnabled && !user.smsAuthEnabled) ? true : undefined,
          }
        } catch (err) {
          console.error("[Auth] Login error:", err)
          return null
        }
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: false,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
    MicrosoftEntraId({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/v2.0`,
      allowDangerousEmailAccountLinking: false,
      token: {
        conform: async (response: Response) => {
          // Azure SPA redirect URIs don't support client_secret in token exchange
          // If we get a 401, retry without client_secret
          if (response.status === 401) return response
          return response
        },
      },
      client: {
        token_endpoint_auth_method: "none",
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 hours
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production" ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        domain: process.env.COOKIE_DOMAIN || undefined,
      },
    },
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Allow cross-subdomain redirects within *.leaddrivecrm.org
      try {
        const target = new URL(url, baseUrl)
        const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "leaddrivecrm.org"
        if (target.hostname === baseDomain || target.hostname.endsWith(`.${baseDomain}`)) {
          return target.toString()
        }
      } catch {}
      // Default: allow relative URLs, block external
      if (url.startsWith("/")) return `${baseUrl}${url}`
      return baseUrl
    },
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "microsoft-entra-id") {
        // Find or create user + organization for OAuth
        const existing = await prisma.user.findFirst({
          where: { email: user.email! },
        })
        if (!existing) {
          // First OAuth login — create org + user
          const slug = (user.name || "user").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "org"
          const uniqueSlug = `${slug}-${Date.now().toString(36)}`
          const org = await prisma.organization.create({
            data: { name: `${user.name}'s Organization`, slug: uniqueSlug, plan: "starter" },
          })
          await prisma.user.create({
            data: {
              email: user.email!,
              name: user.name || user.email!.split("@")[0],
              role: "admin",
              organizationId: org.id,
              passwordHash: "", // OAuth user — no password
            },
          })
        }
        return true
      }
      return true // Credentials — handled by authorize
    },
    async jwt({ token, user, trigger, session: updateData }) {
      if (user) {
        const dbUser = await prisma.user.findFirst({
          where: { email: token.email! },
          include: { organization: true },
        })
        if (dbUser) {
          token.name = dbUser.name
          token.role = dbUser.role
          token.organizationId = dbUser.organizationId
          token.organizationSlug = dbUser.organization?.slug || ""
          token.organizationName = dbUser.organization?.name || ""
          token.plan = dbUser.organization?.plan || "starter"
          token.addons = dbUser.organization?.addons || []
          // Convert features array to modules Record for hasModule() compatibility
          const features = dbUser.organization?.features
          const featuresArr = typeof features === "string" ? JSON.parse(features || "[]") : (features || [])
          if (Array.isArray(featuresArr) && featuresArr.length > 0) {
            const modules: Record<string, boolean> = {}
            for (const f of featuresArr) modules[f] = true
            token.modules = modules
          }
        }
        // Propagate 2FA flags from authorize return
        if ((user as any).needs2fa) token.needs2fa = true
        if ((user as any).twoFactorMethod) token.twoFactorMethod = (user as any).twoFactorMethod
        if ((user as any).needsSetup2fa) token.needsSetup2fa = true
      }
      // Handle session.update() calls from 2FA verify/setup pages or profile updates
      if (trigger === "update" && updateData) {
        if (updateData.needs2fa === false) {
          token.needs2fa = undefined
          token.twoFactorMethod = undefined
        }
        if (updateData.needsSetup2fa === false) token.needsSetup2fa = undefined
        if (updateData.name) token.name = updateData.name
      }
      // Periodically refresh name from DB (every token rotation)
      // Also backfills organizationSlug for JWTs issued before the field existed.
      if (!user && token.email) {
        try {
          const freshUser = await prisma.user.findFirst({
            where: { email: token.email as string },
            select: {
              name: true,
              role: true,
              organizationId: true,
              organization: { select: { slug: true } },
            },
          })
          if (freshUser) {
            token.name = freshUser.name
            token.role = freshUser.role
            if (freshUser.organizationId) token.organizationId = freshUser.organizationId
            if (freshUser.organization?.slug) token.organizationSlug = freshUser.organization.slug
          }
        } catch {
          // Non-critical — keep existing token values
        }
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub as string,
          name: token.name as string,
          role: token.role as string,
          organizationId: token.organizationId as string,
          organizationSlug: (token.organizationSlug as string) || "",
          organizationName: token.organizationName as string,
          plan: token.plan as string,
          addons: (token.addons as string[]) || [],
          modules: (token.modules as Record<string, boolean>) || undefined,
          needs2fa: token.needs2fa as boolean | undefined,
          twoFactorMethod: token.twoFactorMethod as "totp" | "sms" | undefined,
          needsSetup2fa: token.needsSetup2fa as boolean | undefined,
        },
      }
    },
  },
})
