import { z } from "zod";

import { isMonthValue } from "@/lib/month-date";

const month = z.string().refine(isMonthValue);

export const educationSchema = z
  .object({
    id: z.union([z.literal(""), z.uuid()]),
    updatedAt: z.union([z.literal(""), z.iso.datetime()]),
    slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    institution: z.string().trim().min(1).max(240),
    startDate: month,
    endDate: z.union([z.literal(""), month]),
    isCurrent: z.boolean(),
    order: z.coerce.number().int().min(0).max(10_000),
    esDegree: z.string().trim().min(1).max(300),
    enDegree: z.string().trim().min(1).max(300),
  })
  .refine(({ isCurrent, endDate }) => isCurrent === !endDate, {
    path: ["endDate"],
  })
  .refine(({ startDate, endDate }) => !endDate || endDate >= startDate, {
    path: ["endDate"],
  })
  .refine(({ id, updatedAt }) => Boolean(id) === Boolean(updatedAt), {
    path: ["updatedAt"],
  });
