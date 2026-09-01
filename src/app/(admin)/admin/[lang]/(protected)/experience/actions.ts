"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { isCmsWriteEnabled } from "@/config/env";
import type { DeleteActionState } from "@/components/admin/delete-form";
import {
  deleteAdminExperience,
  saveAdminExperience,
} from "@/data/admin/experience";
import { requireAdmin } from "@/lib/auth/authorization";
import { experienceSchema } from "./experience-schema";

export type ExperienceActionState = {
  status:
    | "idle"
    | "success"
    | "invalid"
    | "disabled"
    | "conflict"
    | "cache-error"
    | "error";
  id?: string;
  updatedAt?: string;
};

export const initialExperienceState: ExperienceActionState = { status: "idle" };

export async function saveExperienceAction(
  _state: ExperienceActionState,
  formData: FormData,
): Promise<ExperienceActionState> {
  try {
    await requireAdmin();
  } catch {
    return { status: "error", id: _state.id, updatedAt: _state.updatedAt };
  }
  if (!isCmsWriteEnabled()) return { status: "disabled", id: _state.id, updatedAt: _state.updatedAt };

  const result = experienceSchema.safeParse({
    id: formData.get("id"),
    updatedAt: formData.get("updatedAt"),
    slug: formData.get("slug"),
    company: formData.get("company"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    order: formData.get("order"),
    esRole: formData.get("esRole"),
    esDescription: formData.get("esDescription"),
    enRole: formData.get("enRole"),
    enDescription: formData.get("enDescription"),
  });
  if (!result.success) return { status: "invalid", id: _state.id, updatedAt: _state.updatedAt };

  try {
    const value = result.data;
    const saved = await saveAdminExperience({
      id: value.id || undefined,
      updatedAt: value.updatedAt || undefined,
      slug: value.slug,
      company: value.company,
      startDate: value.startDate,
      endDate: value.endDate,
      order: value.order,
      showOnPortfolio: formData.get("showOnPortfolio") === "on",
      showOnCv: formData.get("showOnCv") === "on",
      es: { role: value.esRole, description: value.esDescription },
      en: { role: value.enRole, description: value.enDescription },
    });
    if (!saved) return { status: "conflict", id: _state.id, updatedAt: _state.updatedAt };
    try {
      updateTag("portfolio");
    } catch (error) {
      console.error("Experience saved, but cache invalidation failed", error);
      return { status: "cache-error", ...saved };
    }
    return { status: "success", ...saved };
  } catch (error) {
    console.error("Failed to save experience", error);
    return { status: "error", id: _state.id, updatedAt: _state.updatedAt };
  }
}

export async function deleteExperienceAction(
  _state: DeleteActionState,
  formData: FormData,
): Promise<DeleteActionState> {
  try { await requireAdmin(); } catch { return { status: "error" }; }
  if (!isCmsWriteEnabled()) return { status: "disabled" };
  const id = String(formData.get("id") ?? "");
  const updatedAt = String(formData.get("updatedAt") ?? "");
  if (!z.uuid().safeParse(id).success || !z.iso.datetime().safeParse(updatedAt).success) return { status: "error" };
  let deleted: boolean;
  try {
    deleted = await deleteAdminExperience(id, updatedAt);
  } catch (error) {
    console.error("Experience deletion failed", error);
    return { status: "error" };
  }
  if (!deleted) return { status: "conflict" };
  try { updateTag("portfolio"); } catch (error) {
    console.error("Experience deleted, but cache invalidation failed", error);
    return { status: "cache-error" };
  }
  return { status: "deleted" };
}
