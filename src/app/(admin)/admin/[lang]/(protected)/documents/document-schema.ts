import { z } from "zod";

export const aiContextSchema = z.object({
  professionalContext: z.string().trim().min(40).max(20_000),
  personalContext: z.string().trim().max(20_000),
});

export const applicationDocumentSchema = z.object({
  locale: z.enum(["es", "en"]),
  company: z.string().trim().min(1).max(240),
  role: z.string().trim().min(1).max(240),
  sourceUrl: z.union([z.literal(""), z.url().startsWith("https://")]),
  jobDescription: z.string().trim().min(100).max(30_000),
  notes: z.string().trim().max(10_000),
});
