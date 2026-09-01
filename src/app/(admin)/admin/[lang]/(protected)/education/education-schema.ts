import { z } from "zod";

export const educationSchema = z
  .object({
    id: z.union([z.literal(""), z.uuid()]),
    updatedAt: z.union([z.literal(""), z.iso.datetime()]),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    institution: z.string().trim().min(1).max(240),
    startDate: z.iso.date(),
    endDate: z.union([z.literal(""), z.iso.date()]),
    order: z.coerce.number().int().min(0).max(10_000),
    esDegree: z.string().trim().min(1).max(300),
    enDegree: z.string().trim().min(1).max(300),
  })
  .refine(({ startDate, endDate }) => !endDate || endDate >= startDate, {
    path: ["endDate"],
  })
  .refine(({ id, updatedAt }) => Boolean(id) === Boolean(updatedAt), {
    path: ["updatedAt"],
  });
