"use client";

import { DoorOpenIcon } from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { useState } from "react";
import { FaGithub } from "react-icons/fa6";

import { Button } from "@/components/ui/button";

type AuthButtonProps =
  | { mode: "sign-in"; callbackUrl: string; label: string; compact?: boolean; className?: string }
  | { mode: "sign-out"; callbackUrl: string; label: string; compact?: boolean; className?: string };

export function AuthButton({
  mode,
  callbackUrl,
  label,
  compact = false,
  className,
}: AuthButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    try {
      if (mode === "sign-in") {
        const locale = callbackUrl.match(/^\/admin\/(es|en)(?:\/|$)/)?.[1];
        if (locale) {
          const secure = window.location.protocol === "https:" ? "; Secure" : "";
          document.cookie = `admin-locale=${locale}; Path=/admin; SameSite=Lax; Max-Age=900${secure}`;
        }
        await signIn("github", { callbackUrl });
      } else {
        await signOut({ callbackUrl });
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      size={mode === "sign-in" ? "lg" : compact ? "icon-sm" : "icon"}
      variant={mode === "sign-in" ? "default" : "destructive"}
      className={className}
      disabled={pending}
      onClick={handleClick}
      aria-label={label}
    >
      {mode === "sign-in" ? <FaGithub /> : <DoorOpenIcon />}
      {mode === "sign-in" ? label : <span className="sr-only">{label}</span>}
    </Button>
  );
}
