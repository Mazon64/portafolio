// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ usePathname: () => "/en" }));
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }) }));
import { SiteChatProvider } from "./site-chat-context";
import { ProjectDialogCard } from "@/components/portfolio/project-dialog-card";
const id = "00000000-0000-4000-8000-000000000001";
const copy = { empty: "Empty", imagePlaceholder: "Image", expand: "View project", progress: "Progress", technologies: "Technologies", status: "Status", details: "Details", repository: "Repository", prototype: "Demo", newTab: "New tab", statuses: { planned: "Planned", inProgress: "In progress", paused: "Paused", completed: "Completed", archived: "Archived" } };
const project = { slug: "portfolio", name: "Portfolio", summary: "Public project", detailedInfo: "Details", techStack: ["Next.js"], status: "inProgress" as const, progressPct: 70, lastTelemetryAt: null, demoUrl: null, repositoryUrl: null };
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let started: boolean;
let turns: unknown[];
let fetchMock: ReturnType<typeof vi.fn>;
function snapshot() { return { enabled: true, conversation: started ? { id, pinned: false, expiresAt: new Date(Date.now() + 86400_000).toISOString() } : null, turns, nextCursor: null }; }
async function settle() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 35)); }); }
async function click(label: string) {
  const button = [...document.querySelectorAll("button")].find((b) => b.getAttribute("aria-label") === label || b.textContent === label)!;
  await act(async () => button.click()); await settle();
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); started = false; turns = [];
  fetchMock = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.endsWith("/session") && options?.method === "POST") { started = true; return Response.json(snapshot()); }
    if (url.endsWith("/messages")) {
      const body = JSON.parse(options!.body as string);
      turns = [{ id, requestId: body.requestId, locale: "en", status: "COMPLETE", createdAt: new Date().toISOString(), context: body.context, scope: { kind: "person", projectSlugs: [], usePageContext: false, clarification: "" }, messages: [
        { id: "user", role: "USER", content: body.message, sources: [], pinned: false, createdAt: new Date().toISOString() },
        { id: "assistant", role: "ASSISTANT", content: "David's public experience.", sources: [], pinned: false, createdAt: new Date().toISOString() },
      ] }];
      return Response.json(snapshot());
    }
    return Response.json(snapshot());
  });
  vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
describe("site-wide chat experience", () => {
  it("shows the consent and navigation context in read-only Preview without starting a session", async () => {
    fetchMock.mockResolvedValue(Response.json({ enabled: false, preview: true, conversation: null, turns: [], nextCursor: null }));
    await act(async () => root.render(<SiteChatProvider locale="en"><section id="projects"><ProjectDialogCard project={project} locale="en" copy={copy} /></section></SiteChatProvider>));
    await click("View details of Portfolio"); await click("Open chat");
    expect(document.body.textContent).toContain("No cookies are created or messages stored here.");
    expect(document.body.textContent).toContain("This site stores messages for 3 days.");
    expect(document.body.textContent).toContain("Projects · portfolio");
    expect(document.querySelector<HTMLButtonElement>("[data-chat-start]")!.disabled).toBe(true);
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(0);
  });
  it("explains continuity and retention before starting, then resumes stored messages on reopening", async () => {
    await act(async () => root.render(<SiteChatProvider locale="en"><section id="about">About</section></SiteChatProvider>));
    expect(fetchMock).not.toHaveBeenCalled();
    await click("Open chat");
    expect(document.querySelector('[aria-label="Portfolio assistant"] header button[aria-label="Close chat"]')).toBeNull();
    expect(document.querySelector('button[aria-label="Close chat"] svg.lucide-x')).not.toBeNull();
    expect(document.body.textContent).toContain("3 days");
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(0);
    await click("Start chat");
    expect(fetchMock.mock.calls.some(([, options]) => options?.body && JSON.parse(options.body as string).accepted === true)).toBe(true);
    const input = document.querySelector("textarea")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input, "What is David's experience?");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => input.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await settle();
    expect(document.body.textContent).toContain("David's public experience.");
    await click("Close chat"); await click("Open chat");
    expect(document.body.textContent).toContain("David's public experience.");
    expect(fetchMock.mock.calls.filter(([url, options]) => url.endsWith("/session") && options?.method === "POST")).toHaveLength(1);
  });
  it("remains usable while viewing a project and sends that context without forcing the topic", async () => {
    started = true;
    await act(async () => root.render(<SiteChatProvider locale="en"><section id="projects"><ProjectDialogCard project={project} locale="en" copy={copy} /></section></SiteChatProvider>));
    await click("View details of Portfolio"); await click("Open chat");
    const modal = document.querySelector('[role="dialog"]')!;
    expect(modal.querySelector('[aria-label="Portfolio assistant"]')).not.toBeNull();
    const input = modal.querySelector("textarea")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(input, "Tell me about David, not this project.");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => input.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    await settle();
    const sent = fetchMock.mock.calls.find(([url]) => url.endsWith("/messages"))!;
    expect(JSON.parse(sent[1]!.body as string).context).toEqual({ path: "/en", section: "projects", projectSlug: "portfolio" });
    await act(async () => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    await settle();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(document.querySelector('[aria-label="Portfolio assistant"]')).toBeNull();
  });
});
