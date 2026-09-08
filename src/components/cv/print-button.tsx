"use client";

import { PrinterIcon } from "lucide-react";

export function PrintButton({
  label,
  documentTitle,
}: {
  label: string;
  documentTitle?: string;
}) {
  function printDocument() {
    if (!documentTitle) {
      window.print();
      return;
    }

    const previousTitle = document.title;
    document.title = documentTitle;
    window.addEventListener(
      "afterprint",
      () => {
        document.title = previousTitle;
      },
      { once: true },
    );
    window.print();
  }

  return (
    <button
      data-print-hidden
      type="button"
      onClick={printDocument}
      className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <PrinterIcon aria-hidden="true" className="size-4" />
      {label}
    </button>
  );
}
