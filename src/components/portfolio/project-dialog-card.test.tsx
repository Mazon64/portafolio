// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("next/image", () => ({ default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }) }));
import { ProjectDialogCard } from "./project-dialog-card";
import type { ProjectDto } from "@/data/portfolio.types";
import type { RepositoryAsset } from "@/lib/projects/schemas";

const project: ProjectDto = { slug: "portfolio", name: "Portfolio", summary: "A documented application", detailedInfo: "Technical details", techStack: ["Next.js"], status: "inProgress", progressPct: 99, lastTelemetryAt: null, demoUrl: "https://example.com", repositoryUrl: "https://github.com/owner/repo" };
const copy = { empty: "Empty", imagePlaceholder: "Image", expand: "View project", progress: "Progress", technologies: "Technologies", status: "Status", details: "Details", repository: "Repository", prototype: "Demo", newTab: "New tab", statuses: { planned: "Planned", inProgress: "In progress", paused: "Paused", completed: "Completed", archived: "Archived" } };
const asset = (category: RepositoryAsset["category"], name: string): RepositoryAsset => ({
  category, url: `https://raw.githubusercontent.com/owner/repo/${"a".repeat(40)}/docs/portfolio/images/${category}/${name}.png`,
  sourcePath: `docs/portfolio/images/${category}/${name}.png`, blobSha: "b".repeat(40), analysisModel: "test", analysisPolicy: "1", alt: { es: name, en: name }, caption: { es: "Descripción", en: "Description" },
});
let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); container = document.createElement("div"); document.body.append(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
describe("project detail modal", () => {
  it("opens details on card click, groups gallery by purpose, closes with Escape and restores focus", async () => {
    await act(async () => root.render(<ProjectDialogCard project={project} locale="en" copy={copy} ragEnabled={false} extra={{ assets: [asset("interface", "Home screen"), asset("features", "Feature output")], milestones: [], progressPct: null, indexed: false, narrative: null, sources: [] }} />));
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    const trigger = container.querySelector("button")!;
    await act(async () => { trigger.focus(); trigger.click(); });
    const modal = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(modal).not.toBeNull(); expect(modal.textContent).toContain("Technical details");
    const category = [...modal.querySelectorAll("button")].find((button) => button.textContent === "Features")!;
    await act(async () => category.click());
    expect(modal.querySelector('img[alt="Feature output"]')).not.toBeNull();
    expect(modal.querySelector('img[alt="Home screen"]')).toBeNull();
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });
  it("opens without a fabricated cover and has an explicitly labelled close button", async () => {
    await act(async () => root.render(<ProjectDialogCard project={project} locale="es" copy={copy} ragEnabled={false} />));
    expect(container.querySelector("img")).toBeNull();
    await act(async () => container.querySelector("button")!.click());
    const close = document.querySelector<HTMLButtonElement>('button[aria-label="Cerrar detalle del proyecto"]')!;
    expect(close).not.toBeNull();
    await act(async () => close.click());
    await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
  });
});
