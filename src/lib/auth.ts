import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
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
          }
        } catch (err) {
          console.error("[Auth] Login error:", err)
          return null
        }
      },
    }),
  ],
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 }, // 8 hours
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = user.role
        token.organizationId = user.organizationId
        token.organizationName = user.organizationName
        token.plan = user.plan
      }
      // SECURITY: Invalidate session if password was changed after token was issued.
      // Only check DB every 60 seconds to avoid excessive queries.
      const now = Date.now()
      const lastPwCheck = (token._lastPwCheck as number) || 0
      if (token.sub && token.iat && now - lastPwCheck > 60_000) {
        token._lastPwCheck = now
        const dbUser = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { passwordChangedAt: true },
        })
        if (dbUser?.passwordChangedAt) {
          const tokenIssuedAt = (token.iat as number) * 1000 // JWT iat is in seconds
          if (dbUser.passwordChangedAt.getTime() > tokenIssuedAt) {
            // Password was changed after this token was issued — force re-login
            return {} as any // Empty token triggers sign-out
          }
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
          role: token.role as string,
          organizationId: token.organizationId as string,
          organizationName: token.organizationName as string,
          plan: token.plan as string,
        },
      }
    },
  },
})
