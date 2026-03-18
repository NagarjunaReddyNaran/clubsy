import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.currency = (user as { currency?: string }).currency ?? "CAD";
        await loadClubIntoToken(token, user.id as string, token.role as string);
      }
      if (trigger === "update") {
        await loadClubIntoToken(token, token.id as string, token.role as string);
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.currency = token.currency as string;
        session.user.clubId = token.clubId as string | null;
        session.user.clubName = token.clubName as string | null;
        session.user.subscriptionStatus = token.subscriptionStatus as string | null;
        session.user.trialEndsAt = token.trialEndsAt as string | null;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      if (path.startsWith("/admin")) {
        return isLoggedIn && auth?.user?.role === "ADMIN";
      }
      if (path.startsWith("/onboarding")) {
        return isLoggedIn && auth?.user?.role === "ADMIN";
      }
      if (path.startsWith("/dashboard")) {
        return isLoggedIn;
      }
      return true;
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          currency: user.currency,
        };
      },
    }),
  ],
};

async function loadClubIntoToken(
  token: Record<string, unknown>,
  userId: string,
  role: string
) {
  if (role === "ADMIN") {
    const club = await prisma.club.findUnique({ where: { adminId: userId } });
    token.clubId = club?.id ?? null;
    token.clubName = club?.name ?? null;
    token.subscriptionStatus = club?.subscriptionStatus ?? null;
    token.trialEndsAt = club?.trialEndsAt?.toISOString() ?? null;
  } else {
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { clubId: true, club: { select: { name: true } } },
    });
    token.clubId = dbUser?.clubId ?? null;
    token.clubName = dbUser?.club?.name ?? null;
    token.subscriptionStatus = null;
    token.trialEndsAt = null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
