import "server-only";

import { auth } from "@/auth";
import { getAdminGithubId } from "@/config/env";

export type AdminIdentity = {
  githubId: string;
};

export class UnauthorizedError extends Error {
  constructor() {
    super("Administrator authorization is required");
    this.name = "UnauthorizedError";
  }
}

export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const [session, allowedId] = await Promise.all([auth(), getAdminGithubId()]);
  const user = session?.user;

  if (!allowedId || user?.githubId !== allowedId) return null;

  return {
    githubId: user.githubId,
  };
}

export async function requireAdmin(): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity) throw new UnauthorizedError();
  return identity;
}
