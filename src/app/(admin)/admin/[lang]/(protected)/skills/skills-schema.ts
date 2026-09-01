import { z } from "zod";

const version = {
  id: z.union([z.literal(""), z.uuid()]),
  updatedAt: z.union([z.literal(""), z.iso.datetime()]),
};
const slug = z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const categorySchema = z.object({
  ...version,
  slug,
  presentation: z.enum(["ICON_TILES", "BADGES"]),
  order: z.coerce.number().int().min(0).max(10_000),
  esTitle: z.string().trim().min(1).max(200),
  esDescription: z.string().trim().min(1).max(2_000),
  enTitle: z.string().trim().min(1).max(200),
  enDescription: z.string().trim().min(1).max(2_000),
}).refine(({ id, updatedAt }) => Boolean(id) === Boolean(updatedAt));

export const skillSchema = z.object({
  ...version,
  categoryId: z.uuid(),
  slug,
  iconKey: z.string().trim().max(80),
  order: z.coerce.number().int().min(0).max(10_000),
  esName: z.string().trim().min(1).max(160),
  enName: z.string().trim().min(1).max(160),
}).refine(({ id, updatedAt }) => Boolean(id) === Boolean(updatedAt));
