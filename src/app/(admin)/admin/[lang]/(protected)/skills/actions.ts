"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { isCmsWriteEnabled } from "@/config/env";
import {
  deleteAdminSkill,
  deleteAdminSkillCategory,
  saveAdminSkill,
  saveAdminSkillCategory,
} from "@/data/admin/skills";
import { requireAdmin } from "@/lib/auth/authorization";
import { categorySchema, skillSchema } from "./skills-schema";

export type SkillActionState = { status: "idle" | "success" | "invalid" | "disabled" | "conflict" | "cache-error" | "error" };
export const initialSkillState: SkillActionState = { status: "idle" };

async function canWrite() {
  try { await requireAdmin(); } catch { return false; }
  return isCmsWriteEnabled();
}

export async function saveCategoryAction(_state: SkillActionState, formData: FormData): Promise<SkillActionState> {
  if (!(await canWrite())) return { status: isCmsWriteEnabled() ? "error" : "disabled" };
  const result = categorySchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { status: "invalid" };
  try {
    const value = result.data;
    const saved = await saveAdminSkillCategory({
      id: value.id || undefined,
      updatedAt: value.updatedAt || undefined,
      slug: value.slug,
      presentation: value.presentation,
      order: value.order,
      showOnPortfolio: formData.get("showOnPortfolio") === "on",
      showOnCv: formData.get("showOnCv") === "on",
      esTitle: value.esTitle,
      esDescription: value.esDescription,
      enTitle: value.enTitle,
      enDescription: value.enDescription,
    });
    if (!saved) return { status: "conflict" };
    try { updateTag("portfolio"); } catch (error) {
      console.error("Skill category saved, but cache invalidation failed", error);
      return { status: "cache-error" };
    }
    return { status: "success" };
  } catch (error) {
    console.error("Failed to save skill category", error);
    return { status: "error" };
  }
}

export async function saveSkillAction(_state: SkillActionState, formData: FormData): Promise<SkillActionState> {
  if (!(await canWrite())) return { status: isCmsWriteEnabled() ? "error" : "disabled" };
  const result = skillSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { status: "invalid" };
  try {
    const value = result.data;
    const saved = await saveAdminSkill({
      id: value.id || undefined,
      updatedAt: value.updatedAt || undefined,
      categoryId: value.categoryId,
      slug: value.slug,
      iconKey: value.iconKey,
      order: value.order,
      showOnPortfolio: formData.get("showOnPortfolio") === "on",
      showOnCv: formData.get("showOnCv") === "on",
      esName: value.esName,
      enName: value.enName,
    });
    if (!saved) return { status: "conflict" };
    try { updateTag("portfolio"); } catch (error) {
      console.error("Skill saved, but cache invalidation failed", error);
      return { status: "cache-error" };
    }
    return { status: "success" };
  } catch (error) {
    console.error("Failed to save skill", error);
    return { status: "error" };
  }
}

export async function deleteCategoryAction(formData: FormData) {
  if (!(await canWrite())) return;
  const id = String(formData.get("id") ?? "");
  const updatedAt = String(formData.get("updatedAt") ?? "");
  if (z.uuid().safeParse(id).success && z.iso.datetime().safeParse(updatedAt).success && await deleteAdminSkillCategory(id, updatedAt)) updateTag("portfolio");
}

export async function deleteSkillAction(formData: FormData) {
  if (!(await canWrite())) return;
  const id = String(formData.get("id") ?? "");
  const updatedAt = String(formData.get("updatedAt") ?? "");
  if (z.uuid().safeParse(id).success && z.iso.datetime().safeParse(updatedAt).success && await deleteAdminSkill(id, updatedAt)) updateTag("portfolio");
}
