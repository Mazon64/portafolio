import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PrintButton } from "./print-button";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PrintButton", () => {
  it("uses the artifact title while the print dialog is open", () => {
    const print = vi.fn();
    let afterPrint: (() => void) | undefined;
    vi.stubGlobal("document", { title: "Administration" });
    vi.stubGlobal("window", {
      print,
      addEventListener: vi.fn((event: string, callback: () => void) => {
        if (event === "afterprint") afterPrint = callback;
      }),
    });
    const button = PrintButton({
      label: "Print or save as PDF",
      documentTitle: "Backend Engineer CV",
    }) as ReactElement<{ onClick: () => void }>;

    button.props.onClick();

    expect(document.title).toBe("Backend Engineer CV");
    expect(print).toHaveBeenCalledOnce();
    afterPrint?.();
    expect(document.title).toBe("Administration");
  });
});
