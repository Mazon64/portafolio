// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectIntegrationWorkspace } from "@/data/admin/project-integration";
import { projectIntegrationCopy } from "@/i18n/project-integration";
const { action, router } = vi.hoisted(() => ({ action: vi.fn(), router: { push: vi.fn(), refresh: vi.fn() } }));
vi.mock("./integration-actions", () => ({ projectIntegrationAction: action }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
import { ProjectIntegrationPanel } from "./integration-panel";
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const date = "2026-09-01T00:00:00.000Z";
const workspace: ProjectIntegrationWorkspace = {
  project: { id: "project", name: "Portfolio", repositoryFullName: "Mazon64/portafolio", visible: false },
  integration: { updatedAt: date, enabled: true, repositoryId: "42" }, jobs: [],
  published: { id: "published", commitSha: "a".repeat(40), publishedAt: date, sources: [], snapshot: null },
};
async function render(value = workspace) {
  await act(async () => root.render(<ProjectIntegrationPanel workspace={value} copy={projectIntegrationCopy.en} enabled />));
}
async function submit(operation: string) {
  const form = container.querySelector<HTMLInputElement>(`input[name="operation"][value="${operation}"]`)!.form!;
  await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks(); container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); });
describe("project integration UI state", () => {
  it("retains the observed configuration token on unrelated refresh and accepts its own new token", async () => {
    await render();
    const token = () => container.querySelector<HTMLInputElement>('input[name="updatedAt"]')!.value;
    await render({ ...workspace, integration: { ...workspace.integration!, updatedAt: "2026-09-02T00:00:00.000Z" } });
    expect(token()).toBe(date);
    action.mockResolvedValueOnce({ status: "success", configurationUpdatedAt: "2026-09-03T00:00:00.000Z" });
    await submit("save");
    expect(token()).toBe("2026-09-03T00:00:00.000Z");
    action.mockResolvedValueOnce({ status: "invalid" });
    await submit("save");
    expect(token()).toBe("2026-09-03T00:00:00.000Z");
  });
  it("has no manual publication, media or milestone editor", async () => {
    await render();
    expect(container.querySelector('input[name="operation"][value="publish"]')).toBeNull();
    expect(container.querySelector('input[name="assets"]')).toBeNull();
    expect(container.querySelector('input[name="milestones"]')).toBeNull();
    expect(container.querySelector('textarea[name="sourcePaths"]')).toBeNull();
    expect(container.textContent).toContain(projectIntegrationCopy.en.automaticHint);
  });
});
