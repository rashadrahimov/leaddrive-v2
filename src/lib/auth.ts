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

          // Verify password
          const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
          if (!valid) return null

          // Update last login
          await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date(), loginCount: { increment: 1 } },
          }).catch(() => {}) // Non-critical

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            organizationId: user.organizationId,
            organizationName: user.organization.name,
            plan: user.organization.plan,
            // 2FA flags
            needs2fa: user.totpEnabled ? true : undefined,
            needsSetup2fa: (user.require2fa && !user.totpEnabled) ? true : undefined,
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
        domain: process.env.NODE_ENV === "production" ? ".leaddrivecrm.org" : undefined,
      },
    },
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" || account?.provider === "microsoft-entra-id") {
        // Find or create user + organization for OAuth
        const existing = await prisma.user.findFirst({
          where: { email: user.email! },
        })
        if (!existing) {
          // First OAuth login — create org + user
          const org = await prisma.organization.create({
            data: { name: `${user.name}'s Organization`, plan: "starter" },
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
          token.role = dbUser.role
          token.organizationId = dbUser.organizationId
          token.organizationName = dbUser.organization?.name || ""
          token.plan = dbUser.organization?.plan || "starter"
        }
        // Propagate 2FA flags from authorize return
        if ((user as any).needs2fa) token.needs2fa = true
        if ((user as any).needsSetup2fa) token.needsSetup2fa = true
      }
      // Handle session.update() calls from 2FA verify/setup pages
      if (trigger === "update" && updateData) {
        if (updateData.needs2fa === false) token.needs2fa = undefined
        if (updateData.needsSetup2fa === false) token.needsSetup2fa = undefined
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.sub as string,
          role: token.role as string,
          organizationId: token.organizationId as string,
          organizationName: token.organizationName as string,
          plan: token.plan as string,
          needs2fa: token.needs2fa as boolean | undefined,
          needsSetup2fa: token.needsSetup2fa as boolean | undefined,
        },
      }
    },
  },
})
