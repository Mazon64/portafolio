// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AdminDocumentWorkspace } from "@/data/admin/documents";
import { adminCopy } from "@/i18n/admin";

const { generatePublic, saveContext, publish } = vi.hoisted(() => ({
  generatePublic: vi.fn(), saveContext: vi.fn(), publish: vi.fn(),
}));
vi.mock("./actions", () => ({
  generatePublicCvAction: generatePublic,
  saveAiContextAction: saveContext,
  publishPublicCvAction: publish,
  generateApplicationAction: vi.fn(),
  deleteDocumentArtifactAction: vi.fn(),
  saveApplicationDocumentsAction: vi.fn(),
  savePublicCvDraftAction: vi.fn(),
}));

import { DocumentWorkspace, PublishForm } from "./document-workspace";

const router = {
  back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), push: vi.fn(),
  replace: vi.fn(), prefetch: vi.fn(), bfcacheId: "documents",
};
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
const workspace: AdminDocumentWorkspace = {
  schemaReady: true, filters: {}, context: null, artifacts: [],
  history: { page: 1, totalPages: 1, totalItems: 0 },
};

async function renderWorkspace(value = workspace) {
  await act(async () => root.render(
    <AppRouterContext.Provider value={router}>
      <DocumentWorkspace locale="en" copy={adminCopy.en.documents} workspace={value} sourceHashes={{ es: "es", en: "en" }} />
    </AppRouterContext.Provider>,
  ));
}

async function submit(form: HTMLFormElement) {
  await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

describe("document UI state", () => {
  it("uses App Router filters, synchronizes clearing/back navigation, and preserves edited generated drafts", async () => {
    generatePublic.mockResolvedValue({ status: "generated", publicDraft: {
      draftId: "draft", locale: "en", sourceHash: "hash", model: "model", proof: "proof",
      content: { summary: "Generated summary", experience: [], projects: [] },
      experienceLabels: [], projectLabels: [],
    } });
    await renderWorkspace();
    const generationForm = container.querySelector<HTMLInputElement>('input[name="locale"][value="en"]')!.form!;
    await submit(generationForm);
    const summary = container.querySelector<HTMLTextAreaElement>('textarea[name="summary"]')!;
    expect(summary.value).toBe("Generated summary");
    summary.value = "My unsaved edit";
    const context = container.querySelector<HTMLTextAreaElement>('textarea[name="professionalContext"]')!;
    context.value = "Unsaved private context";
    const company = container.querySelector<HTMLInputElement>('input[name="company"]')!;
    company.value = "Unsaved application";

    const filtered = { ...workspace, filters: { query: "engineer", kind: "ATS_CV" as const, locale: "EN" as const, status: "DRAFT" as const } };
    await renderWorkspace(filtered);
    const query = container.querySelector<HTMLInputElement>('input[name="query"]')!;
    expect(query.value).toBe("engineer");
    await submit(query.form!);
    expect(router.push).toHaveBeenCalledWith(expect.stringContaining("query=engineer"), expect.objectContaining({ scroll: false }));
    await act(async () => {
      const clear = [...container.querySelectorAll("a")].find((link) => link.textContent === adminCopy.en.documents.clearFilters)!;
      clear.click();
    });
    await renderWorkspace();
    expect(query.value).toBe("");
    for (const select of query.form!.querySelectorAll("select")) expect(select.value).toBe("");
    expect(container.querySelector('textarea[name="summary"]')).toBe(summary);
    expect(summary.value).toBe("My unsaved edit");
    expect(context.value).toBe("Unsaved private context");
    expect(company.value).toBe("Unsaved application");
    await renderWorkspace(filtered);
    expect(query.value).toBe("engineer");
    expect(summary.value).toBe("My unsaved edit");
  });

  it.each(["success", "cache-error"])("refreshes after every context commit, including repeated %s results", async (status) => {
    saveContext.mockImplementation(async () => ({ status }));
    await renderWorkspace();
    const form = container.querySelector<HTMLTextAreaElement>('textarea[name="professionalContext"]')!.form!;
    await submit(form);
    expect(router.refresh).toHaveBeenCalledTimes(1);
    await submit(form);
    expect(router.refresh).toHaveBeenCalledTimes(2);
  });

  it.each(["success", "cache-error"])("retains %s feedback when refresh makes publication unavailable", async (status) => {
    publish.mockResolvedValue({ status });
    await act(async () => root.render(
      <AppRouterContext.Provider value={router}>
        <PublishForm id="draft" copy={adminCopy.en.documents} enabled />
      </AppRouterContext.Provider>,
    ));
    await submit(container.querySelector("form")!);
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(container.querySelector("button")!.disabled).toBe(true);
    expect(container.textContent).toContain(adminCopy.en.documents.actionStatus[status as "success" | "cache-error"]);
    const form = container.querySelector("form");
    await act(async () => root.render(
      <AppRouterContext.Provider value={router}>
        <PublishForm id="draft" copy={adminCopy.en.documents} enabled={false} />
      </AppRouterContext.Provider>,
    ));
    expect(container.querySelector("form")).toBe(form);
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector('[role="status"]')!.textContent).toBe(adminCopy.en.documents.actionStatus[status as "success" | "cache-error"]);
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it("shows no publication button or feedback when opening a non-draft CV", async () => {
    await act(async () => root.render(
      <AppRouterContext.Provider value={router}>
        <PublishForm id="published" copy={adminCopy.en.documents} enabled={false} />
      </AppRouterContext.Provider>,
    ));
    expect(container.querySelector("form")).not.toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
