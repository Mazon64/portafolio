export function getSiteUrl(): URL | undefined {
  const value = process.env.SITE_URL?.trim();

  if (!value) return undefined;

  try {
    return new URL(value);
  } catch {
    throw new Error("SITE_URL must be an absolute URL");
  }
}

export function getNextAuthUrl(): URL | undefined {
  const value = process.env.NEXTAUTH_URL?.trim();
  const vercelEnvironment = process.env.VERCEL_ENV?.trim();

  if (!value) {
    if (vercelEnvironment === "production" || vercelEnvironment === "preview") {
      throw new Error("NEXTAUTH_URL is required on Vercel");
    }
    return undefined;
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NEXTAUTH_URL must be an absolute URL");
  }

  const isLoopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLoopback)) {
    throw new Error("NEXTAUTH_URL must use HTTPS outside localhost");
  }
  if (url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("NEXTAUTH_URL must contain only an origin");
  }

  const expectedVercelOrigin =
    vercelEnvironment === "production"
      ? "https://davidaranda.dev"
      : vercelEnvironment === "preview"
        ? "https://preview.davidaranda.dev"
        : undefined;
  if (expectedVercelOrigin && url.origin !== expectedVercelOrigin) {
    throw new Error(`NEXTAUTH_URL must be ${expectedVercelOrigin} on ${vercelEnvironment}`);
  }

  return new URL(url.origin);
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
  if (process.env.CMS_WRITES_ENABLED?.trim() !== "true") return false;

  const vercelEnvironment = process.env.VERCEL_ENV?.trim();
  return !vercelEnvironment || vercelEnvironment === "production";
}
