import { z } from "zod";
import { getPrisma } from "@/lib/prisma";
import { governanceEnabled } from "@/data/project-disclosure";
import { canPublish, disclosureSchema } from "@/lib/projects/disclosure";
import { readMedia } from "@/lib/projects/storage";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hidden = () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  if (!governanceEnabled() || !z.uuid().safeParse(id).success) return hidden();
  const media = await getPrisma().projectMedia.findUnique({ where: { id }, include: { project: { select: { showOnPortfolio: true, disclosure: true } } } });
  const policy = disclosureSchema.safeParse(media?.project.disclosure?.policy);
  if (!media?.project.showOnPortfolio || !policy.success || !canPublish(policy.data, "portfolio") || !policy.data.fields.media || policy.data.mode === "ANONYMIZED" || !(policy.data.media.some((asset) => asset.id === id) || policy.data.organizations.some((org) => org.logoUrl === `/api/project-media/${id}`))) return hidden();
  try {
    const bytes = await readMedia(media.objectKey);
    const current = await getPrisma().projectDisclosurePolicy.findUnique({ where: { projectId: media.projectId }, select: { revision: true } });
    if (current?.revision !== media.project.disclosure?.revision) return hidden();
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503, headers: { "Cache-Control": "private, no-store" } }); }
}
