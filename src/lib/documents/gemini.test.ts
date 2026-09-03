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
    vi.stubEnv("GEMINI_API_KEYS", "secret-key");
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
    vi.spyOn(Math, "random").mockReturnValue(0.8);
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
    vi.spyOn(Math, "random").mockReturnValue(0);
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
      vi.spyOn(Math, "random").mockReturnValue(0);
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
    vi.spyOn(Math, "random").mockReturnValue(0);
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
    ).rejects.toThrow("Gemini returned an invalid document");
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
