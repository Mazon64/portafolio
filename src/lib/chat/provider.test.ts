import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { requestChatFunctions } from "./provider";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("Gemini function protocol", () => {
  it("preserves thought signatures and restricts the last round to respond", async () => {
    vi.stubEnv("GEMINI_API_KEYS", "synthetic-test-key");
    const model = { role: "model" as const, parts: [{ thoughtSignature: "opaque-signature", functionCall: { name: "get_cv", args: {} } }] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ candidates: [{ content: model }] })); vi.stubGlobal("fetch", fetchMock);
    expect(await requestChatFunctions("instruction", [], [])).toEqual(model);
    fetchMock.mockResolvedValue(Response.json({ candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "respond", args: {} } }] } }] }));
    await requestChatFunctions("instruction", [model], [], true);
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.contents[0].parts[0].thoughtSignature).toBe("opaque-signature");
    expect(body.toolConfig.functionCallingConfig).toEqual({ mode: "ANY", allowedFunctionNames: ["respond"] });
  });
  it("fails over invalid keys without exposing provider details", async () => {
    vi.stubEnv("GEMINI_API_KEYS", "synthetic-a,synthetic-b");
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ error: { details: [{ reason: "API_KEY_INVALID" }], message: "private provider details" } }, { status: 400 }))
      .mockResolvedValueOnce(Response.json({ candidates: [{ content: { role: "model", parts: [{ functionCall: { name: "get_cv", args: {} } }] } }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(requestChatFunctions("instruction", [], [])).resolves.toMatchObject({ role: "model" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
