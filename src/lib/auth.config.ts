import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config for `src/proxy.ts` (middleware).
 * Must NOT import bcrypt, prisma, or any native / Node-only modules —
 * importing those here hangs the dev server and produces the
 * "Page Unresponsive" black screen on /login.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: unknown }).id = token.id;
        (session.user as { role?: unknown }).role = token.role;
      }
      return session;
    },
  },
};
