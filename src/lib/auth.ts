import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // Staff accounts use bcrypt hashes; OAuth users have an empty hash.
        if (user.passwordHash) {
          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;
        } else if (password.length > 0) {
          // Non-credentials login for passwordless OAuth users must not provide a password.
          return null;
        }

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // Auto-provision Google sign-in users in our DB.
      if (user.email) {
        const existing = await prisma.user.findUnique({ where: { email: user.email } });
        if (!existing) {
          await prisma.user.create({
            data: {
              email: user.email,
              name: user.name ?? null,
              passwordHash: "", // OAuth users have no local password
              role: "VIEWER",
            },
          });
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      // For OAuth users, look up our DB record to get the internal id + role.
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
        }
      }
      if (user && !token.id) {
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
});