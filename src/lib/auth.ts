import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { verifySync } from "otplib"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  totpCode: z.string().optional(),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totpCode: { label: "2FA Code", type: "text" },
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

          // 2FA check
          if (user.totpEnabled && user.totpSecret) {
            const totpCode = parsed.data.totpCode

            // No code provided — signal frontend to show 2FA step
            if (!totpCode) {
              throw new Error("2FA_REQUIRED")
            }

            // Verify TOTP code
            const isValidTotp = verifySync({ token: totpCode, secret: user.totpSecret }).valid

            if (!isValidTotp) {
              // Check backup codes
              const backupCodes = (user.backupCodes as string[]) || []
              const backupIndex = backupCodes.indexOf(totpCode)

              if (backupIndex === -1) {
                throw new Error("INVALID_2FA_CODE")
              }

              // Valid backup code — remove it (one-time use)
              const updatedCodes = [...backupCodes]
              updatedCodes.splice(backupIndex, 1)
              await prisma.user.update({
                where: { id: user.id },
                data: { backupCodes: updatedCodes },
              })
            }
          }

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
            // 2FA: needs verification if TOTP already set up, or forced setup if require2fa
            needs2fa: user.totpEnabled === true,
            needsSetup2fa: user.require2fa === true && user.totpEnabled === false,
          }
        } catch (err) {
          // Re-throw 2FA-specific errors so NextAuth passes them to the client
          if (err instanceof Error && (err.message === "2FA_REQUIRED" || err.message === "INVALID_2FA_CODE")) {
            throw err
          }
          console.error("[Auth] Login error:", err)
          return null
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
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
        token.needs2fa = (user as any).needs2fa ?? false
        token.needsSetup2fa = (user as any).needsSetup2fa ?? false
      }
      // Allow client to clear needs2fa/needsSetup2fa after successful verification/setup
      if (trigger === "update") {
        if (session?.needs2fa === false) token.needs2fa = false
        if (session?.needsSetup2fa === false) token.needsSetup2fa = false
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
          needs2fa: token.needs2fa as boolean,
          needsSetup2fa: token.needsSetup2fa as boolean,
        },
      }
    },
  },
})
