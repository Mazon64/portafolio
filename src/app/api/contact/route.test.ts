import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

function contactRequest(
  body: Record<string, unknown>,
  identifier = "203.0.113.10",
) {
  return new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
      "x-forwarded-for": identifier,
    },
    body: JSON.stringify(body),
  });
}

const validMessage = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "I would like to discuss a software project.",
  website: "",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("contact route", () => {
  it("rejects invalid contact data", async () => {
    const response = await POST(contactRequest({ ...validMessage, email: "bad" }));

    expect(response.status).toBe(400);
  });

  it("accepts honeypot submissions without delivering them", async () => {
    const response = await POST(
      contactRequest({ ...validMessage, website: "https://spam.example" }),
    );

    expect(response.status).toBe(202);
  });

  it("delivers a validated message through Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("CONTACT_FROM_EMAIL", "Portfolio <contact@example.com>");
    vi.stubEnv("CONTACT_TO_EMAIL", "owner@example.com");
    const delivery = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", delivery);

    const response = await POST(contactRequest(validMessage, "203.0.113.11"));

    expect(response.status).toBe(202);
    expect(delivery).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
