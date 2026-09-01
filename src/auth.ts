import "server-only";

import type { Account, NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GitHubProvider from "next-auth/providers/github";

import { getAdminGithubId } from "@/config/env";

const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60;

export function isSessionWithinAbsoluteLifetime(
  startedAt: unknown,
  now = Date.now(),
): startedAt is number {
  return (
    typeof startedAt === "number" &&
    now >= startedAt &&
    now - startedAt < SESSION_MAX_AGE_SECONDS * 1_000
  );
}

function getGithubAccountId(account: Account | null): string | undefined {
  if (account?.provider !== "github") return undefined;

  const id = account.providerAccountId.trim();
  return /^\d+$/.test(id) ? id : undefined;
}

export function isAllowedGithubAccount(account: Account | null): boolean {
  const allowedId = getAdminGithubId();
  return Boolean(allowedId && getGithubAccountId(account) === allowedId);
}

export const authOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID?.trim() ?? "",
      clientSecret: process.env.AUTH_GITHUB_SECRET?.trim() ?? "",
    }),
  ],
  secret: process.env.AUTH_SECRET?.trim() || undefined,
  session: {
    strategy: "jwt",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    error: "/admin/auth-error",
  },
  callbacks: {
    async signIn({ account }) {
      return isAllowedGithubAccount(account);
    },
    async jwt({ token, account }) {
      if (account?.provider === "github") {
        const githubId = getGithubAccountId(account);
        if (githubId) {
          token.githubId = githubId;
          token.sessionStartedAt = Date.now();
        }
      }
      if (!isSessionWithinAbsoluteLifetime(token.sessionStartedAt)) {
        delete token.githubId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.githubId = token.githubId;
      return session;
    },
  },
} satisfies NextAuthOptions;

export function auth() {
  return getServerSession(authOptions);
}
