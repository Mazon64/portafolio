import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const randomIntMock = vi.hoisted(() => vi.fn<(max: number) => number>(() => 0));

vi.mock("server-only", () => ({}));
vi.mock("node:crypto", () => ({ randomInt: randomIntMock }));

import { DocumentGenerationError, generateStructuredDocument, providerRejectionCode } from "./gemini";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Gemini document generation", () => {
  it("tries another key for explicit key-invalid HTTP 400 responses", async () => {
    vi.stubEnv("GEMINI_API_KEYS", "key-400-a,key-400-b");
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ error: { details: [{ reason: "API_KEY_INVALID" }] } }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ candidates: [{ content: { parts: [{ text: '{"value":"ok"}' }] } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateStructuredDocument({ instruction: "Grounded content", source: {}, responseSchema: {}, validator: z.object({ value: z.literal("ok") }) })).resolves.toMatchObject({ content: { value: "ok" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("reports provider rejection codes without echoing credentials or provider messages", async () => {
    const code = await providerRejectionCode(Response.json({ error: { status: "INVALID_ARGUMENT", message: "API key not valid: synthetic-sensitive-value", details: [{ reason: "API_KEY_INVALID" }] } }, { status: 400 }));
    expect(code).toBe("HTTP_400_API_KEY_INVALID");
    expect(code).not.toContain("synthetic-sensitive-value");
    expect(await providerRejectionCode(Response.json({ error: { message: "opaque sensitive input" } }, { status: 503 }))).toBe("HTTP_503");
  });
  it("sends labelled image bytes for project vision without applying CV-only wording", async () => {
    vi.stubEnv("GEMINI_API_KEYS", "vision-test-key");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ candidates: [{ content: { parts: [{ text: '{"value":"ok"}' }] } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await generateStructuredDocument({
      instruction: "Describe observable pixels.", source: { path: "interface/home.webp" }, domain: "projects",
      images: [{ label: "interface/home.webp", mimeType: "image/webp", data: "dGVzdA==" }],
      responseSchema: {}, validator: z.object({ value: z.literal("ok") }),
    });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[2]).toEqual({ inlineData: { mimeType: "image/webp", data: "dGVzdA==" } });
    expect(body.systemInstruction.parts[0].text).not.toContain("Never mention AI");
    expect(body.generationConfig.maxOutputTokens).toBe(8192);
  });
  it("sends the key as a header and validates structured output", async () => {
    vi.stubEnv("GEMINI_API_KEYS", "secret-key");
    vi.stubEnv("GEMINI_MODEL", "configured-model");
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
    ).resolves.toMatchObject({ content: { value: "grounded" }, model: "configured-model" });
    expect(fetchMock.mock.calls[0][0]).toContain("/models/configured-model:generateContent");
    expect(fetchMock.mock.calls[0][1].headers["x-goog-api-key"]).toBe("secret-key");
    expect(fetchMock.mock.calls[0][0]).not.toContain("secret-key");

    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    const systemInstruction = request.systemInstruction.parts[0].text;
    expect(systemInstruction).toContain("Write natural, concise, specific, professional prose");
    expect(systemInstruction).toContain("Never mention AI");
    expect(systemInstruction).toContain("generic enthusiasm");
    expect(systemInstruction).toContain("clichés");
    expect(systemInstruction).toContain("unverifiable claims");
    expect(systemInstruction).toContain("robotic narration");
    expect(systemInstruction).toContain("repeated first-person sentence openings");
    expect(systemInstruction).toContain("requestNotes field");
    expect(systemInstruction).toContain("optional writing preferences, not facts");
  });

  it("balances consecutive requests across the configured keys", async () => {
    vi.stubEnv("GEMINI_API_KEYS", "balance-a,balance-b");
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"value":"ok"}' }] } }] }),
          { status: 200 },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const input = {
      instruction: "Write grounded content.",
      source: {},
      responseSchema: {},
      validator: z.object({ value: z.literal("ok") }),
    };
    await generateStructuredDocument(input);
    await generateStructuredDocument(input);
    await generateStructuredDocument(input);

    const usedKeys = fetchMock.mock.calls.map((call) => call[1].headers["x-goog-api-key"]);
    expect(usedKeys[0]).not.toBe(usedKeys[1]);
    expect(usedKeys[2]).toBe(usedKeys[0]);
  });

  it("randomizes the first key used by a new pool", async () => {
    randomIntMock.mockReturnValueOnce(2);
    vi.stubEnv("GEMINI_API_KEYS", "random-a,random-b,random-c");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"value":"ok"}' }] } }] }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await generateStructuredDocument({
      instruction: "Write grounded content.",
      source: {},
      responseSchema: {},
      validator: z.object({ value: z.literal("ok") }),
    });

    expect(fetchMock.mock.calls[0][1].headers["x-goog-api-key"]).toBe("random-c");
  });

  it("uses the next key after a retryable provider failure", async () => {
    vi.stubEnv("GEMINI_API_KEYS", "retry-a\nretry-b,retry-a");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("quota exceeded", { status: 429 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: '{"value":"recovered"}' }] } }],
          }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateStructuredDocument({
        instruction: "Write grounded content.",
        source: {},
        responseSchema: {},
        validator: z.object({ value: z.literal("recovered") }),
      }),
    ).resolves.toMatchObject({ content: { value: "recovered" } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].headers["x-goog-api-key"]).toBe("retry-a");
    expect(fetchMock.mock.calls[1][1].headers["x-goog-api-key"]).toBe("retry-b");
  });

  it.each([401, 403, 408, 425, 429, 500, 503])(
    "fails over after retryable status %i",
    async (status) => {
      vi.stubEnv("GEMINI_API_KEYS", `status-${status}-a,status-${status}-b`);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status }))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              candidates: [{ content: { parts: [{ text: '{"value":"recovered"}' }] } }],
            }),
            { status: 200 },
          ),
        );
      vi.stubGlobal("fetch", fetchMock);

      await expect(
        generateStructuredDocument({
          instruction: "Write grounded content.",
          source: {},
          responseSchema: {},
          validator: z.object({ value: z.literal("recovered") }),
        }),
      ).resolves.toMatchObject({ content: { value: "recovered" } });
      expect(fetchMock).toHaveBeenCalledTimes(2);
    },
  );

  it("tries each unique key once across network, document, and provider failures", async () => {
    vi.stubEnv("GEMINI_API_KEYS", "exhaust-a,exhaust-b,exhaust-c,exhaust-a");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network failure"))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "{}" }] } }] }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateStructuredDocument({
        instruction: "Write grounded content.",
        source: {},
        responseSchema: {},
        validator: z.object({ value: z.string() }),
      }),
    ).rejects.toThrow(
      "Document generation failed: network or timeout, invalid structured response, HTTP_503",
    );
    expect(
      fetchMock.mock.calls.map((call) => call[1].headers["x-goog-api-key"]),
    ).toStrictEqual(["exhaust-a", "exhaust-b", "exhaust-c"]);
  });

  it("does not retry a request error with another key", async () => {
    vi.stubEnv("GEMINI_API_KEYS", "request-a,request-b");
    const fetchMock = vi.fn().mockResolvedValue(new Response("invalid request", { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateStructuredDocument({
        instruction: "Write grounded content.",
        source: {},
        responseSchema: {},
        validator: z.object({}),
      }),
    ).rejects.toBeInstanceOf(DocumentGenerationError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("fails closed without server API keys", async () => {
    vi.stubEnv("GEMINI_API_KEYS", " ,\n");
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
