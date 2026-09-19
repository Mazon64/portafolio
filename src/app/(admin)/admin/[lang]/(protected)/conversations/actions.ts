"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { isCmsWriteEnabled } from "@/config/env";
import { mutateAdminConversation } from "@/data/admin/conversations";

export type ConversationActionState = { status: "idle" | "success" | "disabled" | "invalid" | "conflict" | "error" | "cache-error"; deleted?: boolean };
export async function conversationAction(_state: ConversationActionState, data: FormData): Promise<ConversationActionState> {
  try { await requireAdmin(); } catch { return { status: "disabled" }; }
  if (!isCmsWriteEnabled()) return { status: "disabled" };
  const input = z.object({ conversationId: z.uuid(), id: z.uuid(), updatedAt: z.iso.datetime(), locale: z.enum(["es", "en"]), operation: z.enum(["pin-conversation", "pin-message", "delete"]), pinned: z.enum(["true", "false"]).transform((value) => value === "true") }).safeParse({
    conversationId: data.get("conversationId"), id: data.get("id"), updatedAt: data.get("updatedAt"), locale: data.get("locale"), operation: data.get("operation"), pinned: data.get("pinned"),
  });
  if (!input.success) return { status: "invalid" };
  try { if (!(await mutateAdminConversation(input.data))) return { status: "conflict" }; }
  catch { return { status: "error" }; }
  let refreshed = true;
  try { revalidatePath(`/admin/${input.data.locale}/conversations`, "layout"); }
  catch { refreshed = false; }
  if (input.data.operation === "delete") redirect(`/admin/${input.data.locale}/conversations`);
  return { status: refreshed ? "success" : "cache-error" };
}
