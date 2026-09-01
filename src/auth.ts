import "server-only";

import type { NextAuthOptions, Profile } from "next-auth";
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

function getGithubProfileId(profile: Profile | undefined): string | undefined {
  const id = profile && "id" in profile ? profile.id : undefined;
  return typeof id === "number" || typeof id === "string"
    ? String(id)
    : undefined;
}

export function isAllowedGithubProfile(profile: Profile | undefined): boolean {
  const allowedId = getAdminGithubId();
  return Boolean(allowedId && getGithubProfileId(profile) === allowedId);
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
    async signIn({ account, profile }) {
      return account?.provider === "github" && isAllowedGithubProfile(profile);
    },
    async jwt({ token, account, profile }) {
      if (account?.provider === "github") {
        token.githubId = getGithubProfileId(profile);
        token.sessionStartedAt = Date.now();
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
