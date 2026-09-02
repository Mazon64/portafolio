import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { DocumentGenerationError, generateStructuredDocument } from "./gemini";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Gemini document generation", () => {
  it("sends the key as a header and validates structured output", async () => {
    vi.stubEnv("GEMINI_API_KEY", "secret-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"value":"grounded"}' }] } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateStructuredDocument({
        instruction: "Write grounded content.",
        source: { source: true },
        responseSchema: { type: "object" },
        validator: z.object({ value: z.literal("grounded") }),
      }),
    ).resolves.toMatchObject({ content: { value: "grounded" } });
    expect(fetchMock.mock.calls[0][1].headers["x-goog-api-key"]).toBe("secret-key");
    expect(fetchMock.mock.calls[0][0]).not.toContain("secret-key");
  });

  it("fails closed without a server API key", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    await expect(
      generateStructuredDocument({
        instruction: "Write grounded content.",
        source: {},
        responseSchema: {},
        validator: z.object({}),
      }),
    ).rejects.toBeInstanceOf(DocumentGenerationError);
  });
});
