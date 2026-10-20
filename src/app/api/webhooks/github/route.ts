import { projectIntegrationEnabled } from "@/lib/projects/configuration";
import { boundedBody, validGithubSignature } from "@/lib/projects/http";
import { handleRepositoryEvent, REPOSITORY_EVENTS } from "@/lib/projects/webhook";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  if (!projectIntegrationEnabled() || !secret) return Response.json({ status: "disabled" }, { status: 503 });
  let body: Buffer;
  try { body = await boundedBody(request, 1_000_000); }
  catch { return Response.json({ status: "too_large" }, { status: 413 }); }
  if (!validGithubSignature(body, request.headers.get("x-hub-signature-256"), secret)) {
    return Response.json({ status: "forbidden" }, { status: 403 });
  }
  const event = request.headers.get("x-github-event");
  if (event === "ping") return Response.json({ status: "pong" });
  if (!REPOSITORY_EVENTS.includes(event ?? "")) return Response.json({ status: "ignored" }, { status: 202 });
  return handleRepositoryEvent(event!, body, request.headers.get("x-github-delivery"), "github");
}
