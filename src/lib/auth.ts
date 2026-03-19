import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

        // TODO: Replace with actual DB lookup after Prisma generate
        // const user = await prisma.user.findFirst({
        //   where: { email: parsed.data.email, isActive: true },
        //   include: { organization: true }
        // })
        // if (!user) return null
        // const valid = await bcrypt.compare(parsed.data.password, user.passwordHash)
        // if (!valid) return null

        // Stub for development
        if (parsed.data.email === "admin@leaddrive.com" && parsed.data.password === "admin123") {
          return {
            id: "dev-user-1",
            email: "admin@leaddrive.com",
            name: "Admin",
            role: "admin",
            organizationId: "dev-org-1",
            organizationName: "Dev Organization",
            plan: "enterprise",
          }
        }

        return null
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as Record<string, unknown>).role as string
        token.organizationId = (user as Record<string, unknown>).organizationId as string
        token.organizationName = (user as Record<string, unknown>).organizationName as string
        token.plan = (user as Record<string, unknown>).plan as string
      }
      return token
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          role: token.role as string,
          organizationId: token.organizationId as string,
          organizationName: token.organizationName as string,
          plan: token.plan as string,
        },
      }
    },
  },
})
