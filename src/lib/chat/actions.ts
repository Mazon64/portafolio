import { z } from "zod";

// Shared contract for provider tools, persisted responses and browser execution.
// The model selects capabilities, never JavaScript or arbitrary navigation URLs.
export const contactDraftSchema = z.object({
  name: z.string().trim().max(100),
  email: z.union([z.literal(""), z.email().max(254)]),
  message: z.string().trim().max(5000),
}).strict();
export const interfaceActionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("contact"), draft: contactDraftSchema }).strict(),
  z.object({ kind: z.literal("theme"), theme: z.enum(["light", "dark", "system"]) }).strict(),
  z.object({ kind: z.literal("chat"), operation: z.enum(["restart", "close", "older"]) }).strict(),
]);
export type ContactDraft = z.infer<typeof contactDraftSchema>;
