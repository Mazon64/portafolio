import { generateKeyPairSync, createVerify } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { findInstallation, installationReader, installationSource } from "./github-app";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("repository-scoped GitHub App authentication", () => {
  it("signs a short-lived app JWT and scopes installation access to one repository", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    vi.stubEnv("GITHUB_APP_ID", "123"); vi.stubEnv("GITHUB_APP_PRIVATE_KEY", privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ token: "installation-secret", expires_at: new Date(Date.now() + 3600_000).toISOString() })).mockResolvedValueOnce(Response.json({ id: 42, full_name: "owner/private", private: true, visibility: "private", default_branch: "main" })).mockResolvedValueOnce(Response.json({ content: "safe" }));
    vi.stubGlobal("fetch", fetchMock);
    const reader = await installationReader("11", "42");
    const request = fetchMock.mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual({ repository_ids: [42], permissions: { contents: "read", metadata: "read" } });
    const jwt = request.headers.authorization.replace("Bearer ", "").split(".");
    expect(createVerify("RSA-SHA256").update(`${jwt[0]}.${jwt[1]}`).verify(publicKey, jwt[2], "base64url")).toBe(true);
    const claims = JSON.parse(Buffer.from(jwt[1], "base64url").toString());
    expect(claims.exp - claims.iat).toBeLessThanOrEqual(600);
    expect(JSON.stringify(reader)).not.toContain("installation-secret");
    await reader.read("/contents/README.md");
    expect(fetchMock.mock.calls[2][0]).toBe("https://api.github.com/repos/owner/private/contents/README.md");
    await expect(reader.read("/../other/repository")).rejects.toThrow("Invalid repository path");
  });
  it("blocks installation access in Preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    await expect(installationReader("1", "2")).rejects.toThrow("unavailable");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("falls back to documentation-only access when an installation lacks activity permissions", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    vi.stubEnv("GITHUB_APP_ID", "123"); vi.stubEnv("GITHUB_APP_PRIVATE_KEY", privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    const grant = { token: "t", expires_at: new Date(Date.now() + 3600_000).toISOString() };
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("", { status: 422 })).mockResolvedValueOnce(Response.json(grant))
      .mockResolvedValueOnce(Response.json({ id: 42, full_name: "org/private", private: true, default_branch: "main" }));
    vi.stubGlobal("fetch", fetchMock);
    const source = await installationSource("11", "42");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).permissions).toEqual({ contents: "read", metadata: "read", issues: "read", pull_requests: "read" });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).permissions).toEqual({ contents: "read", metadata: "read" });
    expect(source).toMatchObject({ access: "installation", activity: false, repository: { full_name: "org/private", private: true } });
    expect(JSON.stringify(source)).not.toContain("\"t\"");
  });
  it("finds the installation by stable ID after a rename and reports absence as null", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    vi.stubEnv("GITHUB_APP_ID", "123"); vi.stubEnv("GITHUB_APP_PRIVATE_KEY", privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    const grant = Response.json({ token: "t", expires_at: new Date(Date.now() + 3600_000).toISOString() });
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("/repos/old/name/installation") ? new Response("", { status: 404 })
      : url.includes("/app/installations?") ? Response.json([{ id: 5 }, { id: 6 }])
      : url.includes("/installations/5/") ? new Response("", { status: 422 }) : grant.clone()));
    expect(await findInstallation("42", "old/name")).toBe("6");
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("/app/installations?") ? Response.json([]) : new Response("", { status: 404 })));
    expect(await findInstallation("42", null)).toBeNull();
  });
  it("propagates App outages instead of treating them as an uninstalled repository", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    vi.stubEnv("GITHUB_APP_ID", "123"); vi.stubEnv("GITHUB_APP_PRIVATE_KEY", privateKey.export({ type: "pkcs8", format: "pem" }).toString());
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 502 })));
    await expect(findInstallation("42", "owner/repo")).rejects.toThrow("GitHub App HTTP 502");
  });
});
