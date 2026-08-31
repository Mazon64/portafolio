"use client";

import { PrinterIcon } from "lucide-react";

export function PrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <PrinterIcon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}
