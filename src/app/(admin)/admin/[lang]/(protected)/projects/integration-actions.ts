"use server";

import { randomUUID } from "node:crypto";
import { after } from "next/server";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/authorization";
import { projectIntegrationEnabled } from "@/lib/projects/configuration";
import { integrationSchema } from "@/lib/projects/schemas";
import { enqueueProjectSync, processProjectSync } from "@/lib/projects/sync";
import { connectProjectRepository, initializePortfolioPilot, retryProjectSync, saveProjectIntegration } from "@/data/admin/project-integration";

export type ProjectIntegrationState = {
  status: "idle" | "success" | "queued" | "conflict" | "invalid" | "disabled" | "error" | "cache-error";
  projectId?: string;
  configurationUpdatedAt?: string;
};

function refreshProjects(): boolean {
  let ok = true;
  try { updateTag("portfolio"); } catch { ok = false; }
  for (const locale of ["es", "en"]) {
    try { revalidatePath(`/admin/${locale}/projects`, "layout"); } catch { ok = false; }
  }
  return ok;
}

export async function projectIntegrationAction(_state: ProjectIntegrationState, data: FormData): Promise<ProjectIntegrationState> {
  try { await requireAdmin(); } catch { return { status: "disabled" }; }
  if (!projectIntegrationEnabled()) return { status: "disabled" };
  const operation = data.get("operation");
  if (operation === "pilot" || operation === "connect") {
    try {
      const fullName = String(data.get("repositoryFullName") ?? "").trim().replace(/^https:\/\/github\.com\//i, "").replace(/\/+$/, "").replace(/\.git$/, "");
      if (operation === "connect" && !/^[\w.-]+\/[\w.-]+$/.test(fullName)) return { status: "invalid" };
      const projectId = operation === "pilot" ? await initializePortfolioPilot() : await connectProjectRepository(fullName);
      let queued = true;
      try {
        await enqueueProjectSync(projectId, `connect:${randomUUID()}`, null);
        after(async () => { await processProjectSync(projectId); });
      } catch { queued = false; }
      const refreshed = refreshProjects();
      return { status: queued && refreshed ? "success" : "cache-error", projectId };
    } catch { return { status: "error" }; }
  }
  const id = z.uuid().safeParse(data.get("projectId"));
  if (!id.success) return { status: "invalid" };
  try {
    if (operation === "save") {
      let input;
      try { input = integrationSchema.parse({
        projectId: id.data, updatedAt: data.get("updatedAt"), repositoryFullName: data.get("repositoryFullName"),
        enabled: data.get("enabled") === "on",
      }); } catch { return { status: "invalid" }; }
      const saved = await saveProjectIntegration(input);
      if (!saved) return { status: "conflict" };
      let queued = true;
      if (input.enabled) {
        try {
          await enqueueProjectSync(id.data, `configure:${randomUUID()}`, null);
          after(async () => { await processProjectSync(id.data); });
        } catch { queued = false; }
      }
      const refreshed = refreshProjects();
      return { status: queued && refreshed ? "success" : "cache-error", configurationUpdatedAt: saved.updatedAt };
    } else if (operation === "sync") {
      await enqueueProjectSync(id.data, `manual:${randomUUID()}`, null);
      after(async () => { await processProjectSync(id.data); });
      refreshProjects();
      return { status: "queued" };
    } else if (operation === "process") {
      await processProjectSync(id.data);
    } else if (operation === "retry") {
      const jobId = z.uuid().safeParse(data.get("jobId"));
      if (!jobId.success) return { status: "invalid" };
      if (!(await retryProjectSync(id.data, jobId.data))) return { status: "conflict" };
      after(async () => { await processProjectSync(id.data); });
    } else { return { status: "invalid" }; }
    return { status: refreshProjects() ? "success" : "cache-error" };
  } catch { return { status: "error" }; }
}
