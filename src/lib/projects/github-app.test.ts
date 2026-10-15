import { generateKeyPairSync, createVerify } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { installationReader } from "./github-app";
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
});
