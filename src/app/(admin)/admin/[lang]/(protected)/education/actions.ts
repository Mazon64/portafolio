"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { isCmsWriteEnabled } from "@/config/env";
import type { DeleteActionState } from "@/components/admin/delete-form";
import {
  deleteAdminEducation,
  saveAdminEducation,
} from "@/data/admin/education";
import { requireAdmin } from "@/lib/auth/authorization";
import { educationSchema } from "./education-schema";

export type EducationActionState = {
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

export async function saveEducationAction(
  _state: EducationActionState,
  formData: FormData,
): Promise<EducationActionState> {
  try {
    await requireAdmin();
  } catch {
    return { status: "error", id: _state.id, updatedAt: _state.updatedAt };
  }
  if (!isCmsWriteEnabled()) return { status: "disabled", id: _state.id, updatedAt: _state.updatedAt };

  const result = educationSchema.safeParse({
    id: formData.get("id"),
    updatedAt: formData.get("updatedAt"),
    slug: formData.get("slug"),
    institution: formData.get("institution"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") ?? "",
    isCurrent: formData.get("isCurrent") === "on",
    order: formData.get("order"),
    esDegree: formData.get("esDegree"),
    enDegree: formData.get("enDegree"),
  });
  if (!result.success) return { status: "invalid", id: _state.id, updatedAt: _state.updatedAt };

  try {
    const value = result.data;
    const saved = await saveAdminEducation({
      id: value.id || undefined,
      updatedAt: value.updatedAt || undefined,
      slug: value.slug,
      institution: value.institution,
      startDate: value.startDate,
      endDate: value.endDate,
      isCurrent: value.isCurrent,
      order: value.order,
      showOnPortfolio: formData.get("showOnPortfolio") === "on",
      showOnCv: formData.get("showOnCv") === "on",
      esDegree: value.esDegree,
      enDegree: value.enDegree,
    });
    if (!saved) return { status: "conflict", id: _state.id, updatedAt: _state.updatedAt };
    try {
      updateTag("portfolio");
    } catch (error) {
      console.error("Education saved, but cache invalidation failed", error);
      return { status: "cache-error", ...saved };
    }
    return { status: "success", ...saved };
  } catch (error) {
    console.error("Failed to save education", error);
    return { status: "error", id: _state.id, updatedAt: _state.updatedAt };
  }
}

export async function deleteEducationAction(
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
    deleted = await deleteAdminEducation(id, updatedAt);
  } catch (error) {
    console.error("Education deletion failed", error);
    return { status: "error" };
  }
  if (!deleted) return { status: "conflict" };
  try { updateTag("portfolio"); } catch (error) {
    console.error("Education deleted, but cache invalidation failed", error);
    return { status: "cache-error" };
  }
  return { status: "deleted" };
}
