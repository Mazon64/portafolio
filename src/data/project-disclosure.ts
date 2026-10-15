import "server-only";
import { createHash } from "node:crypto";
import { getPrisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { disclosureSchema, projectProjection, type PublicationSurface } from "@/lib/projects/disclosure";
import type { PortfolioDto } from "./portfolio.types";

// Rollout gate, not an authorization bypass: never disable after policies exist.
export function governanceEnabled() { return process.env.PROJECT_GOVERNANCE_ENABLED === "true"; }
export async function disclosurePolicies(client: Pick<Prisma.TransactionClient, "projectDisclosurePolicy"> = getPrisma()) {
  if (!governanceEnabled()) return [];
  const rows = await client.projectDisclosurePolicy.findMany({ include: { project: { select: { slug: true } } } });
  return rows.map((row) => ({ projectId: row.projectId, slug: row.project.slug, revision: row.revision, policy: disclosureSchema.parse(row.policy) }));
}
export async function publicationVersion(client: Pick<Prisma.TransactionClient, "projectDisclosurePolicy"> = getPrisma()) {
  const rows = await disclosurePolicies(client);
  return createHash("sha256").update(JSON.stringify(rows.map((r) => [r.projectId, r.revision]).sort())).digest("hex");
}
export async function applyProjectDisclosure(data: PortfolioDto, locale: "es" | "en", surface: PublicationSurface, identities?: Map<string, string>): Promise<PortfolioDto> {
  const policies = new Map((await disclosurePolicies()).map((row) => [identities ? row.projectId : row.slug, row.policy]));
  return { ...data, projects: data.projects.flatMap((project) => {
    const policy = policies.get(identities?.get(project.slug) ?? project.slug);
    const result = policy ? projectProjection(project, policy, locale, surface) : project;
    return result ? [result] : [];
  }) };
}
