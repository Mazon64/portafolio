import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createDocumentDraftProof, verifyDocumentDraftProof } from "./draft-proof";

describe("document draft proof", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("binds immutable draft metadata to the server secret", () => {
    vi.stubEnv("AUTH_SECRET", "test-auth-secret");
    const metadata = {
      draftId: "2eb66473-aca8-4f1f-a312-9a697b75a2e3",
      locale: "es",
      sourceHash: "a".repeat(64),
      model: "test-model",
    };
    const proof = createDocumentDraftProof(metadata);

    expect(verifyDocumentDraftProof(metadata, proof)).toBe(true);
    expect(
      verifyDocumentDraftProof({ ...metadata, model: "tampered-model" }, proof),
    ).toBe(false);
  });
});
