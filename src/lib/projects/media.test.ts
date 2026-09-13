import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
const { readBlob, generate } = vi.hoisted(() => ({ readBlob: vi.fn(), generate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./discovery", () => ({ readRepositoryBlob: readBlob }));
vi.mock("@/lib/documents/gemini", () => ({ generateStructuredDocument: generate, getDocumentGenerationModel: () => "vision-model" }));
import { analyzeRepositoryImages } from "./media";
const repo = { id: 42, name: "repo", full_name: "owner/repo", default_branch: "main", private: false, description: null, homepage: null, archived: false, topics: [] };
const image = { path: "docs/portfolio/images/interface/home.png", sha: "a".repeat(40), size: 1000, mode: "100644", type: "blob" };
const description = { path: image.path, alt: { es: "Interfaz", en: "Interface" }, caption: { es: "Una interfaz de usuario.", en: "A user interface." } };
beforeEach(() => { vi.resetAllMocks(); generate.mockResolvedValue({ content: { images: [description] }, model: "vision-model" }); });
describe("repository image understanding", () => {
  it("sends actual normalized pixels, stores metadata only, and pins the image URL", async () => {
    readBlob.mockResolvedValue(await sharp({ create: { width: 640, height: 360, channels: 3, background: "white" } }).png().toBuffer());
    const [asset] = await analyzeRepositoryImages(repo, "b".repeat(40), [image], []);
    const input = generate.mock.calls[0][0];
    expect(input.images[0].mimeType).toBe("image/webp");
    const pixels = Buffer.from(input.images[0].data, "base64");
    expect(pixels.subarray(8, 12).toString()).toBe("WEBP");
    expect(asset.url).toBe(`https://raw.githubusercontent.com/owner/repo/${"b".repeat(40)}/${image.path}`);
    expect(asset.caption.en).toBe(description.caption.en);
    expect(JSON.stringify(asset)).not.toContain(input.images[0].data);
  });
  it("reuses descriptions for unchanged image blobs without downloading or calling AI", async () => {
    const cached = { url: `https://raw.githubusercontent.com/owner/repo/${"b".repeat(40)}/${image.path}`, sourcePath: image.path, blobSha: image.sha, category: "interface" as const, alt: description.alt, caption: description.caption, analysisModel: "vision-model", analysisPolicy: "1" };
    const [asset] = await analyzeRepositoryImages(repo, "c".repeat(40), [image], [cached]);
    expect(readBlob).not.toHaveBeenCalled(); expect(generate).not.toHaveBeenCalled();
    expect(asset.url).toContain("c".repeat(40));
  });
  it("rejects descriptions that refer to an image that was not supplied", async () => {
    readBlob.mockResolvedValue(await sharp({ create: { width: 640, height: 360, channels: 3, background: "white" } }).png().toBuffer());
    generate.mockResolvedValue({ content: { images: [{ ...description, path: "invented.png" }] }, model: "vision-model" });
    await expect(analyzeRepositoryImages(repo, "b".repeat(40), [image], [])).rejects.toThrow("match sources");
  });
});
