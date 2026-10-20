import "server-only";
import { after } from "next/server";
import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { disclosurePolicies } from "@/data/project-disclosure";
import { canPublishPrivateRepository } from "./disclosure";
import { enqueueProjectSync, processProjectSync, withdrawPublicProject } from "./sync";

export const REPOSITORY_EVENTS = ["push", "repository", "milestone", "issues", "release"];
const payloadSchema = z.object({
  ref: z.string().max(200).optional(), after: z.string().regex(/^[a-f0-9]{40}$/).optional(), deleted: z.boolean().optional(),
  repository: z.object({ id: z.number().int().positive(), private: z.boolean(), default_branch: z.string().optional() }),
  issue: z.object({ milestone: z.unknown().optional() }).optional(), milestone: z.unknown().optional(),
});

// Shared by the repository webhook and the GitHub App webhook. Both are verified
// by their own secret before reaching this point.
export async function handleRepositoryEvent(event: string, body: Buffer, deliveryHeader: string | null, origin: "github" | "github-app") {
  const delivery = z.uuid().safeParse(deliveryHeader);
  let payload: z.infer<typeof payloadSchema>;
  try { payload = payloadSchema.parse(JSON.parse(body.toString("utf8"))); }
  catch { return Response.json({ status: "invalid" }, { status: 400 }); }
  if (!delivery.success) return Response.json({ status: "invalid" }, { status: 400 });
  if (event === "push" && (!payload.ref || !payload.after)) return Response.json({ status: "invalid" }, { status: 400 });
  try {
    const config = await getPrisma().projectIntegration.findUnique({ where: { repositoryId: String(payload.repository.id) } });
    if (payload.repository.private) {
      const policy = config ? (await disclosurePolicies()).find((row) => row.projectId === config.projectId)?.policy : undefined;
      if (!config) return Response.json({ status: "ignored" }, { status: 202 });
      if (!canPublishPrivateRepository(policy)) {
        await withdrawPublicProject(config.projectId);
        return Response.json({ status: "withdrawn" }, { status: 202 });
      }
    }
    if (payload.deleted) return Response.json({ status: "ignored" }, { status: 202 });
    if (!config?.enabled || (event === "push" && payload.ref !== `refs/heads/${payload.repository.default_branch ?? config.branch}`)) return Response.json({ status: "ignored" }, { status: 202 });
    // Both webhooks may deliver the same push; the job is keyed by commit to coalesce them.
    const key = event === "push" ? `push:${payload.repository.id}:${payload.after}` : `${origin}:${delivery.data}`;
    const result = await enqueueProjectSync(config.projectId, key, event === "push" ? payload.after! : null);
    if (!result.duplicate) after(async () => { await processProjectSync(config.projectId); });
    return Response.json({ status: result.duplicate ? "duplicate" : "accepted" }, { status: 202 });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
