"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { isCmsWriteEnabled } from "@/config/env";
import { deleteAdminProject, saveAdminProject } from "@/data/admin/projects";
import { requireAdmin } from "@/lib/auth/authorization";
import { projectSchema } from "./project-schema";

export type ProjectActionState = { status: "idle" | "success" | "invalid" | "disabled" | "conflict" | "cache-error" | "error" };
export const initialProjectState: ProjectActionState = { status: "idle" };

export async function saveProjectAction(_state: ProjectActionState, formData: FormData): Promise<ProjectActionState> {
  try { await requireAdmin(); } catch { return { status: "error" }; }
  if (!isCmsWriteEnabled()) return { status: "disabled" };
  const result = projectSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { status: "invalid" };
  try {
    const value = result.data;
    const saved = await saveAdminProject({
      id: value.id || undefined,
      updatedAt: value.updatedAt || undefined,
      slug: value.slug,
      repositoryFullName: value.repositoryFullName,
      demoUrl: value.demoUrl,
      repositoryUrl: value.repositoryUrl,
      techStack: value.techStack,
      order: value.order,
      status: value.status,
      progressPct: value.progressPct,
      showOnPortfolio: formData.get("showOnPortfolio") === "on",
      showOnCv: formData.get("showOnCv") === "on",
      es: { name: value.esName, summary: value.esSummary, detailedInfo: value.esDetailedInfo },
      en: { name: value.enName, summary: value.enSummary, detailedInfo: value.enDetailedInfo },
    });
    if (!saved) return { status: "conflict" };
    try { updateTag("portfolio"); } catch (error) {
      console.error("Project saved, but cache invalidation failed", error);
      return { status: "cache-error" };
    }
    return { status: "success" };
  } catch (error) {
    console.error("Failed to save project", error);
    return { status: "error" };
  }
}

export async function deleteProjectAction(formData: FormData) {
  await requireAdmin();
  if (!isCmsWriteEnabled()) return;
  const id = String(formData.get("id") ?? "");
  const updatedAt = String(formData.get("updatedAt") ?? "");
  if (z.uuid().safeParse(id).success && z.iso.datetime().safeParse(updatedAt).success && await deleteAdminProject(id, updatedAt)) updateTag("portfolio");
}
