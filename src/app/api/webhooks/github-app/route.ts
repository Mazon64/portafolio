import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidateTag } from "next/cache";
import { projectIntegrationEnabled } from "@/lib/projects/configuration";
import { governanceEnabled } from "@/data/project-disclosure";
import { validGithubSignature, boundedBody } from "@/lib/projects/http";
import { serializable } from "@/lib/projects/sync";
import { disclosureSchema } from "@/lib/projects/disclosure";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const secret = process.env.GITHUB_APP_WEBHOOK_SECRET;
  if (!secret || !governanceEnabled() || !projectIntegrationEnabled()) return Response.json({ status: "disabled" }, { status: 503 });
  let body;
  try { body = await boundedBody(request, 1_000_000); } catch { return Response.json({ status: "invalid" }, { status: 413 }); }
  if (!validGithubSignature(body, request.headers.get("x-hub-signature-256"), secret)) return Response.json({ status: "forbidden" }, { status: 403 });
  const event = request.headers.get("x-github-event");
  if (event === "ping") return Response.json({ status: "pong" });
  if (!["installation", "installation_repositories"].includes(event ?? "")) return Response.json({ status: "ignored" }, { status: 202 });
  let input;
  try { input = z.object({ action: z.string(), installation: z.object({ id: z.number().int().positive() }), repositories_removed: z.array(z.object({ id: z.number().int().positive() })).optional() }).parse(JSON.parse(body.toString("utf8"))); }
  catch { return Response.json({ status: "invalid" }, { status: 400 }); }
  const revokeAll = event === "installation" && ["deleted", "suspend"].includes(input.action);
  const removed = event === "installation_repositories" ? (input.repositories_removed ?? []).map((repo) => String(repo.id)) : [];
  if (!revokeAll && !removed.length) return Response.json({ status: "ignored" }, { status: 202 });
  try {
    await serializable(async (tx) => {
      const affected = await tx.projectRepository.findMany({ where: { installationId: String(input.installation.id), enabled: true, ...(revokeAll ? {} : { repositoryId: { in: removed } }) } });
      for (const source of affected) {
        await tx.projectRepository.update({ where: { id: source.id }, data: { enabled: false } });
        const current = await tx.projectDisclosurePolicy.findUniqueOrThrow({ where: { projectId: source.projectId } });
        await tx.projectDisclosurePolicy.update({ where: { projectId: source.projectId }, data: { revision: randomUUID(), policy: { ...disclosureSchema.parse(current.policy), mode: "INTERNAL" } } });
      }
      if (affected.length) {
        await tx.documentArtifact.updateMany({ where: { status: { not: "ARCHIVED" } }, data: { status: "ARCHIVED", publishedAt: null } });
        await tx.chatTurn.updateMany({ where: { status: "PENDING" }, data: { status: "FAILED", failureCode: "SOURCE_REVOKED" } });
        await tx.chatConversation.updateMany({ data: { lockToken: null, lockUntil: null } });
      }
    });
    revalidateTag("portfolio", { expire: 0 });
    return Response.json({ status: "accepted" }, { status: 202 });
  } catch { return Response.json({ status: "unavailable" }, { status: 503 }); }
}
