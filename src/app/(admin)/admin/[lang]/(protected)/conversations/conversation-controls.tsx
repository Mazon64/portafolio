"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PinIcon, PinOffIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatCopy } from "@/i18n/chat";
import type { Locale } from "@/i18n/config";
import { conversationAction, type ConversationActionState } from "./actions";

export function ConversationControl({ conversationId, id, updatedAt, pinned, operation, locale, enabled }: { conversationId: string; id: string; updatedAt: string; pinned: boolean; operation: "pin-conversation" | "pin-message" | "delete"; locale: Locale; enabled: boolean }) {
  const [state, action, pending] = useActionState(conversationAction, { status: "idle" } as ConversationActionState);
  const router = useRouter();
  const copy = chatCopy[locale];
  useEffect(() => { if (state.status === "cache-error") router.refresh(); }, [state, router]);
  const label = operation === "delete" ? copy.remove : operation === "pin-message" ? pinned ? copy.unpinMessage : copy.pinMessage : pinned ? copy.unpin : copy.pin;
  return <form action={action} onSubmit={(event) => { if (operation === "delete" && !window.confirm(copy.confirmRemove)) event.preventDefault(); }}>
    <input type="hidden" name="conversationId" value={conversationId} /><input type="hidden" name="id" value={id} />
    <input type="hidden" name="updatedAt" value={updatedAt} /><input type="hidden" name="locale" value={locale} />
    <input type="hidden" name="operation" value={operation} /><input type="hidden" name="pinned" value={String(!pinned)} />
    <Button size="sm" type="submit" variant={operation === "delete" ? "destructive" : pinned ? "secondary" : "outline"} disabled={!enabled || pending}>
      {operation === "delete" ? <Trash2Icon /> : pinned ? <PinOffIcon /> : <PinIcon />}{label}
    </Button>
    {state.status !== "idle" && <p role="status" className="mt-2 text-xs text-muted-foreground">{copy.adminStatus[state.status]}</p>}
  </form>;
}
