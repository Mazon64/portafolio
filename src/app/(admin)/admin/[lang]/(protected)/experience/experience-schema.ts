import { z } from "zod";

import { isMonthValue } from "@/lib/month-date";

const month = z.string().refine(isMonthValue);

export const experienceSchema = z
  .object({
    id: z.union([z.literal(""), z.uuid()]),
    updatedAt: z.union([z.literal(""), z.iso.datetime()]),
    slug: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    company: z.string().trim().min(1).max(200),
    startDate: month,
    endDate: z.union([z.literal(""), month]),
    isCurrent: z.boolean(),
    order: z.coerce.number().int().min(0).max(10_000),
    esRole: z.string().trim().min(1).max(200),
    esDescription: z.string().trim().min(1).max(8_000),
    enRole: z.string().trim().min(1).max(200),
    enDescription: z.string().trim().min(1).max(8_000),
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
