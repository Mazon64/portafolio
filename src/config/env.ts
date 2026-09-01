export function getSiteUrl(): URL | undefined {
  const value = process.env.SITE_URL?.trim();

  if (!value) return undefined;

  try {
    return new URL(value);
  } catch {
    throw new Error("SITE_URL must be an absolute URL");
  }
}

export function getAdminGithubId(): string | undefined {
  const value = process.env.ADMIN_GITHUB_ID?.trim();

  if (!value) return undefined;

  if (!/^\d+$/.test(value)) {
    throw new Error("ADMIN_GITHUB_ID must be a numeric GitHub user ID");
  }

  return value;
}

export function isCmsWriteEnabled(): boolean {
  return process.env.CMS_WRITES_ENABLED?.trim() === "true";
}
