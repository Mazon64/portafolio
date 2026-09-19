import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
const extras = vi.hoisted(() => vi.fn());
vi.mock("server-only", () => ({}));
vi.mock("@/data/project-knowledge", () => ({ getPublicProjectExtras: extras }));
vi.mock("@/lib/projects/configuration", () => ({ projectRagEnabled: () => true }));
import { ProjectsSection } from "./projects-section";
const copy = { empty: "No projects", imagePlaceholder: "Image", expand: "Expand", progress: "Progress", technologies: "Technologies", status: "Status", details: "Details", repository: "Repository", prototype: "Demo", newTab: "New tab", statuses: { planned: "Planned", inProgress: "In progress", paused: "Paused", completed: "Completed", archived: "Archived" } };
describe("project presentation", () => {
  it("renders a localized card that opens a dialog instead of an inline disclosure", async () => {
    extras.mockResolvedValue({ portfolio: {
      assets: [{ url: "/test-project-cover.webp", category: "interface", alt: { es: "Interfaz", en: "Interface" }, caption: { es: "Captura", en: "Screenshot" } }],
      milestones: [{ id: "core", title: { es: "Base", en: "Core" }, weight: 3, completed: true, evidence: "" }],
      progressPct: 75, indexed: true, sources: [{ path: "README.md", sourceUrl: "https://github.com/owner/repo/blob/commit/README.md" }],
    } });
    const html = renderToStaticMarkup(await ProjectsSection({ locale: "en", copy, projects: [{
      slug: "portfolio", demoUrl: null, repositoryUrl: null, techStack: ["Next.js"], status: "inProgress", progressPct: 10,
      lastTelemetryAt: null, name: "Portfolio", summary: "Summary", detailedInfo: "Details",
    }] }));
    expect(html).toContain('alt="Interface"'); expect(html).toContain('aria-valuenow="75"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain("<details");
    expect(html).toContain("View details of Portfolio");
  });
});
