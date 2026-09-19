import { z } from "zod";

export const CHAT_RETENTION_MS = 3 * 24 * 60 * 60_000;
export const CHAT_COOKIE_SECONDS = CHAT_RETENTION_MS / 1000;
export const CHAT_LEASE_MS = 5 * 60_000;
export const CHAT_SECTIONS = ["hero", "about", "skills", "projects", "experience", "education", "contact", "cv"] as const;
export const chatContextSchema = z.object({
  path: z.enum(["/es", "/en", "/es/cv", "/en/cv"]),
  section: z.enum(CHAT_SECTIONS),
  projectSlug: z.string().regex(/^[a-z0-9-]{1,120}$/).nullable(),
});
export const chatInputSchema = z.object({
  conversationId: z.uuid(), requestId: z.uuid(), message: z.string().trim().min(1).max(1200),
  locale: z.enum(["es", "en"]), context: chatContextSchema,
});
export const chatScopeSchema = z.object({
  kind: z.enum(["person", "projects", "site", "clarify", "out_of_scope"]),
  projectSlugs: z.array(z.string().regex(/^[a-z0-9-]{1,120}$/)).max(3),
  usePageContext: z.boolean(),
  clarification: z.string().max(500),
});
export const chatSourceSchema = z.object({ id: z.string(), title: z.string(), url: z.url().refine((value) => {
  const url = new URL(value);
  return !url.username && !url.password && (url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)));
}), projectSlug: z.string().optional() });
export type ChatContext = z.infer<typeof chatContextSchema>;
export type ChatInput = z.infer<typeof chatInputSchema>;
export type ChatScope = z.infer<typeof chatScopeSchema>;
export type ChatSource = z.infer<typeof chatSourceSchema>;
export type ChatMessageDto = { id: string; role: "USER" | "ASSISTANT"; content: string; sources: ChatSource[]; pinned: boolean; createdAt: string };
export type ChatTurnDto = { id: string; requestId: string; locale: "es" | "en"; status: string; createdAt: string; context: ChatContext; scope: ChatScope | null; messages: ChatMessageDto[] };
export type ChatSessionDto = { enabled: boolean; preview?: boolean; conversation: { id: string; expiresAt: string; pinned: boolean } | null; turns: ChatTurnDto[]; nextCursor: string | null };
