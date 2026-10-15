// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrintButton } from "./print-button";
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  window.print = vi.fn();
  window.history.replaceState(null, "", "/en/cv");
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); });
describe("PrintButton", () => {
  it("uses the artifact title while the print dialog is open", async () => {
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    document.title = "Administration";
    await act(async () => root.render(createElement(PrintButton, { label: "Print or save as PDF", documentTitle: "Backend Engineer CV" })));
    await act(async () => container.querySelector("button")!.click());
    expect(document.title).toBe("Backend Engineer CV"); expect(print).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event("afterprint")); expect(document.title).toBe("Administration");
  });
  it("consumes a chat print intent only once after fonts are ready", async () => {
    window.history.replaceState(null, "", "/en/cv?print=1");
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready: Promise.resolve() } });
    const print = vi.spyOn(window, "print").mockImplementation(() => {});
    await act(async () => root.render(createElement(PrintButton, { label: "Print" })));
    expect(print).toHaveBeenCalledOnce(); expect(window.location.search).toBe("");
  });
});
