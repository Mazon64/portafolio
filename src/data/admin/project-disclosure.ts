import "server-only";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth/authorization";
import { isCmsWriteEnabled } from "@/config/env";
import { getPrisma } from "@/lib/prisma";
import { governanceEnabled } from "@/data/project-disclosure";
import { defaultDisclosure, disclosureSchema } from "@/lib/projects/disclosure";
import { serializable } from "@/lib/projects/sync";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

export async function getProjectDisclosure(projectId: string) {
  await requireAdmin();
  if (!governanceEnabled()) return null;
  const row = await getPrisma().projectDisclosurePolicy.findUnique({ where: { projectId } });
  return { revision: row?.revision ?? "", policy: row ? disclosureSchema.parse(row.policy) : defaultDisclosure };
}
export const saveDisclosureSchema = z.object({ projectId: z.uuid(), revision: z.union([z.literal(""), z.uuid()]), publicSlug: z.string().regex(/^[a-z0-9-]{1,120}$/), policy: disclosureSchema });
export async function saveProjectDisclosure(value: unknown) {
  await requireAdmin();
  if (!isCmsWriteEnabled() || !governanceEnabled()) throw new Error("Disclosure writes disabled");
  const input = saveDisclosureSchema.parse(value);
  return serializable(async (tx) => {
    const current = await tx.projectDisclosurePolicy.findUnique({ where: { projectId: input.projectId } });
    if ((current?.revision ?? "") !== input.revision) return null;
    const mediaIds = [...new Set([...input.policy.media.map((asset) => asset.id), ...input.policy.organizations.flatMap((org) => org.logoUrl ? [org.logoUrl.split("/").at(-1)!] : [])])];
    if (mediaIds.length && await tx.projectMedia.count({ where: { projectId: input.projectId, id: { in: mediaIds } } }) !== mediaIds.length) throw new Error("Media does not belong to this project");
    const revision = randomUUID();
    await tx.projectDisclosurePolicy.upsert({ where: { projectId: input.projectId }, create: { projectId: input.projectId, revision, policy: input.policy }, update: { revision, policy: input.policy } });
    await tx.project.update({ where: { id: input.projectId }, data: { slug: input.publicSlug } });
    // Updating configuration invalidates queued jobs; active workers also compare
    // policy revision before committing, inside their serializable transaction.
    await tx.projectIntegration.updateMany({ where: { projectId: input.projectId }, data: { updatedAt: new Date() } });
    await tx.projectSyncJob.updateMany({ where: { projectId: input.projectId, status: { in: ["QUEUED", "PROCESSING"] } }, data: { status: "SUPERSEDED", leaseToken: null, leaseUntil: null, finishedAt: new Date() } });
    // Existing artifacts may synthesize project facts outside their project list.
    // Archive all derived artifacts rather than attempting textual redaction.
    await tx.documentArtifact.updateMany({ where: { status: { not: "ARCHIVED" } }, data: { status: "ARCHIVED", publishedAt: null } });
    // History is revision-bound on read, including visitor quotations. Preserve
    // the private audit while interrupting generations using the previous policy.
    await tx.chatTurn.updateMany({ where: { status: "PENDING" }, data: { status: "FAILED", failureCode: "PUBLICATION_CHANGED" } });
    await tx.chatConversation.updateMany({ data: { lockToken: null, lockUntil: null } });
    if (input.policy.mode === "EXCLUDED") {
      await tx.projectEvidence.deleteMany({ where: { projectId: input.projectId } });
      await tx.projectRepository.updateMany({ where: { projectId: input.projectId }, data: { enabled: false, analysis: Prisma.DbNull, leaseToken: null, leaseUntil: null } });
    }
    return { revision };
  });
}
