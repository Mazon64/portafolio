import { z } from "zod";
import type { ProjectDto } from "@/data/portfolio.types";

const text = z.object({ es: z.string().trim().max(6000), en: z.string().trim().max(6000) }).strict();
const url = z.string().max(2000).refine((value) => {
  if (!value) return true;
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password; } catch { return false; }
});
export const relationships = ["UNSPECIFIED", "OWNED", "CO_OWNED", "EMPLOYEE", "INTERNSHIP", "CONTRACTOR", "OPEN_SOURCE", "ACADEMIC", "COMMUNITY", "FORK"] as const;
export const disclosureSchema = z.object({
  mode: z.enum(["FULL", "SELECTIVE", "ANONYMIZED", "INTERNAL", "EXCLUDED"]),
  relationship: z.enum(relationships),
  owner: z.string().max(200), // Internal, never projected to a public DTO.
  externalAi: z.enum(["NONE", "PUBLIC_ONLY", "PRIVATE_SELECTED"]),
  embargoUntil: z.union([z.literal(""), z.iso.datetime()]),
  surfaces: z.object({ portfolio: z.boolean(), chat: z.boolean(), cv: z.boolean(), documents: z.boolean() }).strict(),
  fields: z.object({ repository: z.boolean(), demo: z.boolean(), technologies: z.boolean(), status: z.boolean(), milestones: z.boolean(), media: z.boolean(), sources: z.boolean() }).strict(),
  participation: z.object({ role: text, period: text, contribution: text, status: z.enum(["ACTIVE", "FINISHED", "UNSPECIFIED"]), githubIds: z.array(z.string().regex(/^\d+$/)).max(10) }).strict(),
  organizations: z.array(z.object({ kind: z.enum(["OWNER", "EMPLOYER", "CLIENT", "TEAM"]), name: text, logoUrl: z.union([z.literal(""), z.string().regex(/^\/api\/project-media\/[a-f0-9-]{36}$/)]) }).strict()).max(6),
  // Approved facts only. Restricted projects never fall back to source-derived
  // names, descriptions, links, metrics or media if a field has been omitted.
  approved: z.object({ name: text, summary: text, details: text, technologies: z.array(z.string().max(80)).max(20), repositoryUrl: url, demoUrl: url, status: z.enum(["planned", "inProgress", "paused", "completed", "archived"]).nullable().default(null) }).strict(),
  media: z.array(z.object({ id: z.uuid(), alt: text, caption: text, category: z.enum(["interface", "features", "diagrams", "results"]) }).strict()).max(8).default([]),
}).strict().superRefine((policy, ctx) => {
  if (new Set(policy.media.map((asset) => asset.id)).size !== policy.media.length || policy.media.some((asset) => !asset.alt.es || !asset.alt.en)) ctx.addIssue({ code: "custom", message: "Images require unique IDs and accessible descriptions in both languages." });
  if (policy.mode === "ANONYMIZED" && (policy.fields.repository || policy.fields.sources || policy.fields.media || policy.organizations.some((org) => org.logoUrl))) ctx.addIssue({ code: "custom", message: "Anonymous cases cannot expose repository references or identifying media." });
  if (["SELECTIVE", "ANONYMIZED"].includes(policy.mode) && (!policy.approved.name.es || !policy.approved.name.en || !policy.approved.summary.es || !policy.approved.summary.en)) ctx.addIssue({ code: "custom", message: "Restricted publication requires approved names and summaries in both languages." });
});
export type DisclosurePolicy = z.infer<typeof disclosureSchema>;
export type PublicationSurface = keyof DisclosurePolicy["surfaces"];
const blank = { es: "", en: "" };
export const defaultDisclosure: DisclosurePolicy = {
  mode: "FULL", relationship: "UNSPECIFIED", owner: "", externalAi: "PUBLIC_ONLY", embargoUntil: "",
  surfaces: { portfolio: true, chat: true, cv: true, documents: true },
  fields: { repository: true, demo: true, technologies: true, status: true, milestones: true, media: true, sources: true },
  participation: { role: blank, period: blank, contribution: blank, status: "UNSPECIFIED", githubIds: [] }, organizations: [],
  approved: { name: blank, summary: blank, details: blank, technologies: [], repositoryUrl: "", demoUrl: "", status: null },
  media: [],
};
export function canPublish(policy: DisclosurePolicy, surface: PublicationSurface, now = Date.now()) {
  return !["INTERNAL", "EXCLUDED"].includes(policy.mode) && policy.surfaces[surface] && (!policy.embargoUntil || Date.parse(policy.embargoUntil) <= now);
}
export function canUsePublicSources(policy: DisclosurePolicy, surface: PublicationSurface) {
  return canPublish(policy, surface) && policy.mode === "FULL" && policy.fields.sources && (surface !== "chat" || policy.externalAi !== "NONE");
}
export function projectProjection(project: ProjectDto, policy: DisclosurePolicy, locale: "es" | "en", surface: PublicationSurface): ProjectDto | null {
  if (!canPublish(policy, surface)) return null;
  const full = policy.mode === "FULL";
  return {
    slug: project.slug,
    name: full ? project.name : policy.approved.name[locale],
    summary: full ? project.summary : policy.approved.summary[locale],
    detailedInfo: full ? project.detailedInfo : policy.approved.details[locale],
    repositoryUrl: policy.fields.repository ? (full ? project.repositoryUrl : policy.approved.repositoryUrl || null) : null,
    demoUrl: policy.fields.demo ? (full ? project.demoUrl : policy.approved.demoUrl || null) : null,
    techStack: policy.fields.technologies ? (full ? project.techStack : policy.approved.technologies) : [],
    status: policy.fields.status ? (full ? project.status : policy.approved.status ?? "planned") : "planned",
    progressPct: policy.fields.milestones && full ? project.progressPct : 0,
    lastTelemetryAt: full ? project.lastTelemetryAt : null,
    participation: { relationship: policy.relationship, role: policy.participation.role[locale], period: policy.participation.period[locale], contribution: policy.participation.contribution[locale], status: policy.participation.status },
    organizations: policy.organizations.map((org) => ({ kind: org.kind, name: org.name[locale], logoUrl: policy.fields.media ? org.logoUrl || null : null })),
    statusVisible: policy.fields.status && (full || policy.approved.status !== null),
  };
}
