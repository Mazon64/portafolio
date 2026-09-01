import { z } from "zod";

const optionalUrl = z.string().trim().max(2_000).refine(
  (value) => {
    if (!value) return true;
    const result = z.url().safeParse(value);
    if (!result.success) return false;
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  },
);

export const projectSchema = z.object({
  id: z.union([z.literal(""), z.uuid()]),
  updatedAt: z.union([z.literal(""), z.iso.datetime()]),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  repositoryFullName: z.string().trim().max(240).refine(
    (value) => !value || /^[\w.-]+\/[\w.-]+$/.test(value),
  ),
  demoUrl: optionalUrl,
  repositoryUrl: optionalUrl,
  techStack: z.string().trim().max(1_000),
  order: z.coerce.number().int().min(0).max(10_000),
  status: z.enum(["PLANNED", "IN_PROGRESS", "PAUSED", "COMPLETED", "ARCHIVED"]),
  progressPct: z.coerce.number().int().min(0).max(100),
  esName: z.string().trim().min(1).max(240),
  esSummary: z.string().trim().min(1).max(2_000),
  esDetailedInfo: z.string().trim().min(1).max(12_000),
  enName: z.string().trim().min(1).max(240),
  enSummary: z.string().trim().min(1).max(2_000),
  enDetailedInfo: z.string().trim().min(1).max(12_000),
}).refine(({ id, updatedAt }) => Boolean(id) === Boolean(updatedAt));
