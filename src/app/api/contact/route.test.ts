import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";

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
  turnstileToken: "valid-turnstile-token",
};

function stubContactEnvironment() {
  vi.stubEnv("RESEND_API_KEY", "test-key");
  vi.stubEnv("CONTACT_FROM_EMAIL", "Portfolio <contact@example.com>");
  vi.stubEnv("CONTACT_TO_EMAIL", "owner@example.com");
  vi.stubEnv("TURNSTILE_SITE_KEY", "test-site-key");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret-key");
}

function successfulTurnstileResponse() {
  return new Response(
    JSON.stringify({
      success: true,
      hostname: "localhost",
      action: "contact",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("contact route", () => {
  it("only exposes the Turnstile site key when contact is configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");

    expect(await GET().json()).toEqual({
      turnstileSiteKey: null,
    });

    stubContactEnvironment();

    expect(await GET().json()).toEqual({
      turnstileSiteKey: "test-site-key",
    });
  });

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

  it("rejects submissions without a Turnstile token", async () => {
    stubContactEnvironment();

    const response = await POST(
      contactRequest({ ...validMessage, turnstileToken: "" }, "203.0.113.12"),
    );

    expect(response.status).toBe(400);
  });

  it("rejects submissions that fail Turnstile verification", async () => {
    stubContactEnvironment();
    const verification = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", verification);

    const response = await POST(contactRequest(validMessage, "203.0.113.13"));

    expect(response.status).toBe(400);
    expect(verification).toHaveBeenCalledTimes(1);
  });

  it("delivers a validated message through Resend", async () => {
    stubContactEnvironment();
    const delivery = vi
      .fn()
      .mockResolvedValueOnce(successfulTurnstileResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", delivery);

    const response = await POST(contactRequest(validMessage, "203.0.113.11"));

    expect(response.status).toBe(202);
    expect(delivery).toHaveBeenCalledWith(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      expect.objectContaining({ method: "POST" }),
    );
    expect(delivery).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"reply_to":"ada@example.com"'),
      }),
    );
  });
});
