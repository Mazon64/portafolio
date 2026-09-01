"use client";

import { Trash2Icon } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export type DeleteActionState = {
  status: "idle" | "deleted" | "disabled" | "conflict" | "cache-error" | "error";
};

export const initialDeleteState: DeleteActionState = { status: "idle" };

export function DeleteForm({
  action,
  id,
  updatedAt,
  label,
  confirmText,
  messages,
}: {
  action: (state: DeleteActionState, formData: FormData) => Promise<DeleteActionState>;
  id: string;
  updatedAt: string;
  label: string;
  confirmText: string;
  messages: Record<Exclude<DeleteActionState["status"], "idle">, string>;
}) {
  const [state, formAction, pending] = useActionState(action, initialDeleteState);
  const router = useRouter();
  const refreshedStatus = useRef<DeleteActionState["status"]>("idle");

  useEffect(() => {
    if (
      state.status === "deleted" &&
      refreshedStatus.current !== state.status
    ) {
      refreshedStatus.current = state.status;
      router.refresh();
    }
  }, [router, state.status]);

  return (
    <form action={formAction} className="mt-4 border-t border-border pt-4">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="updatedAt" value={updatedAt} />
      <Button
        type="submit"
        variant="destructive"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm(confirmText)) event.preventDefault();
        }}
      >
        <Trash2Icon />
        {label}
      </Button>
      {state.status !== "idle" && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {messages[state.status]}
        </p>
      )}
    </form>
  );
}
