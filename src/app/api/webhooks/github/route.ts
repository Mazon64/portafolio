import { after } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { projectIntegrationEnabled } from "@/lib/projects/configuration";
import { boundedBody, validGithubSignature } from "@/lib/projects/http";
import { enqueueProjectSync, processProjectSync } from "@/lib/projects/sync";

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
  if (event !== "push") return Response.json({ status: "ignored" }, { status: 202 });
  const delivery = z.uuid().safeParse(request.headers.get("x-github-delivery"));
  const parsed = z.object({
    ref: z.string().max(200), after: z.string().regex(/^[a-f0-9]{40}$/), deleted: z.boolean(),
    repository: z.object({ id: z.number().int().positive(), private: z.boolean() }),
  });
  let payload: z.infer<typeof parsed>;
  try { payload = parsed.parse(JSON.parse(body.toString("utf8"))); }
  catch { return Response.json({ status: "invalid" }, { status: 400 }); }
  if (!delivery.success) return Response.json({ status: "invalid" }, { status: 400 });
  if (payload.deleted || payload.repository.private) return Response.json({ status: "ignored" }, { status: 202 });
  try {
    const config = await getPrisma().projectIntegration.findUnique({ where: { repositoryId: String(payload.repository.id) } });
    if (!config?.enabled || payload.ref !== `refs/heads/${config.branch}`) return Response.json({ status: "ignored" }, { status: 202 });
    const result = await enqueueProjectSync(config.projectId, `github:${delivery.data}`, payload.after);
    if (!result.duplicate) after(async () => { await processProjectSync(config.projectId); });
    return Response.json({ status: result.duplicate ? "duplicate" : "accepted" }, { status: 202 });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
