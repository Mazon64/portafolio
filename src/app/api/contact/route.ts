const MAX_BODY_BYTES = 16_000;
const RATE_LIMIT_MS = 60_000;

const globalForContact = globalThis as unknown as {
  contactSubmissions?: Map<string, number>;
};

const contactSubmissions =
  globalForContact.contactSubmissions ?? new Map<string, number>();
globalForContact.contactSubmissions = contactSubmissions;

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !from || !to) {
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

  const name = body.name.trim();
  const email = body.email.trim();
  const message = body.message.trim();
  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `Portfolio message from ${name.replace(/[\r\n]/g, " ")}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      }),
    });
  } catch (error) {
    console.error("Contact message delivery request failed.", error);
    return Response.json({ status: "delivery_failed" }, { status: 502 });
  }

  if (!response.ok) {
    console.error("Contact message delivery failed.", response.status);
    return Response.json({ status: "delivery_failed" }, { status: 502 });
  }

  if (identifier) contactSubmissions.set(identifier, Date.now());

  return Response.json({ status: "accepted" }, { status: 202 });
}

function isContactBody(
  value: unknown,
): value is { name: string; email: string; message: string; website: string } {
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
    typeof body.website === "string"
  );
}
