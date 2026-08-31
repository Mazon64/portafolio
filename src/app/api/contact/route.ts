import { Resend } from "resend";

import {
  ContactNotificationEmail,
  getContactEmailSubject,
  getContactEmailText,
} from "../../../emails/contact-notification";
import { hasLocale, type Locale } from "../../../i18n/config";

const MAX_BODY_BYTES = 16_000;
const RATE_LIMIT_MS = 60_000;
const TURNSTILE_ACTION = "contact";
const TURNSTILE_TOKEN_MAX_LENGTH = 2048;
const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const globalForContact = globalThis as unknown as {
  contactSubmissions?: Map<string, number>;
};

const contactSubmissions =
  globalForContact.contactSubmissions ?? new Map<string, number>();
globalForContact.contactSubmissions = contactSubmissions;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  const configuration = getContactConfiguration();

  return Response.json(
    { turnstileSiteKey: configuration?.turnstileSiteKey ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return Response.json({ status: "invalid" }, { status: 413 });
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) {
        return Response.json({ status: "forbidden" }, { status: 403 });
      }
    } catch {
      return Response.json({ status: "forbidden" }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ status: "invalid" }, { status: 400 });
  }

  if (!isContactBody(body)) {
    return Response.json({ status: "invalid" }, { status: 400 });
  }

  if (body.website.trim()) {
    return Response.json({ status: "accepted" }, { status: 202 });
  }

  const configuration = getContactConfiguration();
  if (!configuration) {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }

  const identifier =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (identifier) {
    const now = Date.now();
    const previousSubmission = contactSubmissions.get(identifier) ?? 0;
    if (now - previousSubmission < RATE_LIMIT_MS) {
      return Response.json({ status: "rate_limited" }, { status: 429 });
    }
  }

  if (!isTurnstileToken(body.turnstileToken)) {
    return Response.json({ status: "verification_failed" }, { status: 400 });
  }

  const turnstileVerified = await verifyTurnstile(
    body.turnstileToken,
    configuration.turnstileSecretKey,
    identifier,
    new URL(request.url).hostname,
  );
  if (!turnstileVerified) {
    return Response.json({ status: "verification_failed" }, { status: 400 });
  }

  const name = body.name.trim();
  const email = body.email.trim();
  const message = body.message.trim();
  const emailProps = { locale: body.locale, name, email, message };
  let deliveryError: { name: string; message: string } | null;
  try {
    const delivery = await new Resend(configuration.apiKey).emails.send({
      from: configuration.from,
      to: [configuration.to],
      replyTo: email,
      subject: getContactEmailSubject(body.locale, name),
      react: ContactNotificationEmail(emailProps),
      text: getContactEmailText(emailProps),
      tags: [
        { name: "category", value: "contact" },
        { name: "locale", value: body.locale },
      ],
    });
    deliveryError = delivery.error;
  } catch (error) {
    console.error("Contact message delivery request failed.", error);
    return Response.json({ status: "delivery_failed" }, { status: 502 });
  }

  if (deliveryError) {
    console.error(
      "Contact message delivery failed.",
      deliveryError.name,
      deliveryError.message,
    );
    return Response.json({ status: "delivery_failed" }, { status: 502 });
  }

  if (identifier) contactSubmissions.set(identifier, Date.now());

  return Response.json({ status: "accepted" }, { status: 202 });
}

function isContactBody(
  value: unknown,
): value is {
  name: string;
  email: string;
  message: string;
  website: string;
  turnstileToken?: unknown;
  locale: Locale;
} {
  if (!value || typeof value !== "object") return false;

  const body = value as Record<string, unknown>;
  return (
    typeof body.name === "string" &&
    body.name.trim().length >= 2 &&
    body.name.trim().length <= 100 &&
    typeof body.email === "string" &&
    body.email.length <= 254 &&
    /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,63}$/.test(
      body.email.trim(),
    ) &&
    typeof body.message === "string" &&
    body.message.trim().length >= 10 &&
    body.message.trim().length <= 5000 &&
    typeof body.website === "string" &&
    typeof body.locale === "string" &&
    hasLocale(body.locale)
  );
}

function getContactConfiguration() {
  if (process.env.CONTACT_DELIVERY_ENABLED !== "true") return null;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CONTACT_FROM_EMAIL?.trim();
  const to = process.env.CONTACT_TO_EMAIL?.trim();
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY?.trim();
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY?.trim();

  if (!apiKey || !from || !to || !turnstileSiteKey || !turnstileSecretKey) {
    return null;
  }

  return { apiKey, from, to, turnstileSiteKey, turnstileSecretKey };
}

function isTurnstileToken(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= TURNSTILE_TOKEN_MAX_LENGTH
  );
}

async function verifyTurnstile(
  token: string,
  secretKey: string,
  remoteIp: string | undefined,
  expectedHostname: string,
) {
  const payload = new URLSearchParams({ secret: secretKey, response: token });
  if (remoteIp) payload.set("remoteip", remoteIp);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: payload,
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      console.error("Turnstile verification request failed.", response.status);
      return false;
    }

    const result: unknown = await response.json();
    if (!result || typeof result !== "object") return false;

    const verification = result as Record<string, unknown>;
    return (
      verification.success === true &&
      verification.action === TURNSTILE_ACTION &&
      verification.hostname === expectedHostname
    );
  } catch (error) {
    console.error("Turnstile verification request failed.", error);
    return false;
  }
}
