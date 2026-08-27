export function getSiteUrl(): URL | undefined {
  const value = process.env.SITE_URL?.trim();

  if (!value) return undefined;

  try {
    return new URL(value);
  } catch {
    throw new Error("SITE_URL must be an absolute URL");
  }
}
