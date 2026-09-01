"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { isCmsWriteEnabled } from "@/config/env";
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
};

export const initialEducationState: EducationActionState = { status: "idle" };

export async function saveEducationAction(
  _state: EducationActionState,
  formData: FormData,
): Promise<EducationActionState> {
  try {
    await requireAdmin();
  } catch {
    return { status: "error" };
  }
  if (!isCmsWriteEnabled()) return { status: "disabled" };

  const result = educationSchema.safeParse({
    id: formData.get("id"),
    updatedAt: formData.get("updatedAt"),
    slug: formData.get("slug"),
    institution: formData.get("institution"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    order: formData.get("order"),
    esDegree: formData.get("esDegree"),
    enDegree: formData.get("enDegree"),
  });
  if (!result.success) return { status: "invalid" };

  try {
    const value = result.data;
    const saved = await saveAdminEducation({
      id: value.id || undefined,
      updatedAt: value.updatedAt || undefined,
      slug: value.slug,
      institution: value.institution,
      startDate: value.startDate,
      endDate: value.endDate,
      order: value.order,
      showOnPortfolio: formData.get("showOnPortfolio") === "on",
      showOnCv: formData.get("showOnCv") === "on",
      esDegree: value.esDegree,
      enDegree: value.enDegree,
    });
    if (!saved) return { status: "conflict" };
    try {
      updateTag("portfolio");
    } catch (error) {
      console.error("Education saved, but cache invalidation failed", error);
      return { status: "cache-error" };
    }
    return { status: "success" };
  } catch (error) {
    console.error("Failed to save education", error);
    return { status: "error" };
  }
}

export async function deleteEducationAction(formData: FormData): Promise<void> {
  await requireAdmin();
  if (!isCmsWriteEnabled()) return;
  const id = String(formData.get("id") ?? "");
  const updatedAt = String(formData.get("updatedAt") ?? "");
  if (!z.uuid().safeParse(id).success || !z.iso.datetime().safeParse(updatedAt).success) return;
  if (await deleteAdminEducation(id, updatedAt)) updateTag("portfolio");
}
