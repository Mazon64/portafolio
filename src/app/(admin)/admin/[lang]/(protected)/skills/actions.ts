"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { isCmsWriteEnabled } from "@/config/env";
import type { DeleteActionState } from "@/components/admin/delete-form";
import {
  deleteAdminSkill,
  deleteAdminSkillCategory,
  saveAdminSkill,
  saveAdminSkillCategory,
} from "@/data/admin/skills";
import { requireAdmin } from "@/lib/auth/authorization";
import { categorySchema, skillSchema } from "./skills-schema";

export type SkillActionState = { status: "idle" | "success" | "invalid" | "disabled" | "conflict" | "cache-error" | "error"; id?: string; updatedAt?: string };
export const initialSkillState: SkillActionState = { status: "idle" };

async function canWrite() {
  try { await requireAdmin(); } catch { return false; }
  return isCmsWriteEnabled();
}

export async function saveCategoryAction(_state: SkillActionState, formData: FormData): Promise<SkillActionState> {
  if (!(await canWrite())) return { status: isCmsWriteEnabled() ? "error" : "disabled", id: _state.id, updatedAt: _state.updatedAt };
  const result = categorySchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { status: "invalid", id: _state.id, updatedAt: _state.updatedAt };
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
    if (!saved) return { status: "conflict", id: _state.id, updatedAt: _state.updatedAt };
    try { updateTag("portfolio"); } catch (error) {
      console.error("Skill category saved, but cache invalidation failed", error);
      return { status: "cache-error", ...saved };
    }
    return { status: "success", ...saved };
  } catch (error) {
    console.error("Failed to save skill category", error);
    return { status: "error", id: _state.id, updatedAt: _state.updatedAt };
  }
}

export async function saveSkillAction(_state: SkillActionState, formData: FormData): Promise<SkillActionState> {
  if (!(await canWrite())) return { status: isCmsWriteEnabled() ? "error" : "disabled", id: _state.id, updatedAt: _state.updatedAt };
  const result = skillSchema.safeParse(Object.fromEntries(formData));
  if (!result.success) return { status: "invalid", id: _state.id, updatedAt: _state.updatedAt };
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
    if (!saved) return { status: "conflict", id: _state.id, updatedAt: _state.updatedAt };
    try { updateTag("portfolio"); } catch (error) {
      console.error("Skill saved, but cache invalidation failed", error);
      return { status: "cache-error", ...saved };
    }
    return { status: "success", ...saved };
  } catch (error) {
    console.error("Failed to save skill", error);
    return { status: "error", id: _state.id, updatedAt: _state.updatedAt };
  }
}

export async function deleteCategoryAction(
  _state: DeleteActionState,
  formData: FormData,
): Promise<DeleteActionState> {
  if (!(await canWrite())) return { status: isCmsWriteEnabled() ? "error" : "disabled" };
  const id = String(formData.get("id") ?? "");
  const updatedAt = String(formData.get("updatedAt") ?? "");
  if (!z.uuid().safeParse(id).success || !z.iso.datetime().safeParse(updatedAt).success) return { status: "error" };
  let deleted: boolean;
  try {
    deleted = await deleteAdminSkillCategory(id, updatedAt);
  } catch (error) {
    console.error("Skill category deletion failed", error);
    return { status: "error" };
  }
  if (!deleted) return { status: "conflict" };
  try { updateTag("portfolio"); } catch (error) {
    console.error("Skill category deleted, but cache invalidation failed", error);
    return { status: "cache-error" };
  }
  return { status: "deleted" };
}

export async function deleteSkillAction(
  _state: DeleteActionState,
  formData: FormData,
): Promise<DeleteActionState> {
  if (!(await canWrite())) return { status: isCmsWriteEnabled() ? "error" : "disabled" };
  const id = String(formData.get("id") ?? "");
  const updatedAt = String(formData.get("updatedAt") ?? "");
  if (!z.uuid().safeParse(id).success || !z.iso.datetime().safeParse(updatedAt).success) return { status: "error" };
  let deleted: boolean;
  try {
    deleted = await deleteAdminSkill(id, updatedAt);
  } catch (error) {
    console.error("Skill deletion failed", error);
    return { status: "error" };
  }
  if (!deleted) return { status: "conflict" };
  try { updateTag("portfolio"); } catch (error) {
    console.error("Skill deleted, but cache invalidation failed", error);
    return { status: "cache-error" };
  }
  return { status: "deleted" };
}
