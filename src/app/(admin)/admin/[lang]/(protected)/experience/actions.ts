"use server";

import { updateTag } from "next/cache";
import { z } from "zod";

import { isCmsWriteEnabled } from "@/config/env";
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
};

export const initialExperienceState: ExperienceActionState = { status: "idle" };

export async function saveExperienceAction(
  _state: ExperienceActionState,
  formData: FormData,
): Promise<ExperienceActionState> {
  try {
    await requireAdmin();
  } catch {
    return { status: "error" };
  }
  if (!isCmsWriteEnabled()) return { status: "disabled" };

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
  if (!result.success) return { status: "invalid" };

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
    if (!saved) return { status: "conflict" };
    try {
      updateTag("portfolio");
    } catch (error) {
      console.error("Experience saved, but cache invalidation failed", error);
      return { status: "cache-error" };
    }
    return { status: "success" };
  } catch (error) {
    console.error("Failed to save experience", error);
    return { status: "error" };
  }
}

export async function deleteExperienceAction(formData: FormData): Promise<void> {
  await requireAdmin();
  if (!isCmsWriteEnabled()) return;
  const id = String(formData.get("id") ?? "");
  const updatedAt = String(formData.get("updatedAt") ?? "");
  if (!z.uuid().safeParse(id).success || !z.iso.datetime().safeParse(updatedAt).success) return;
  if (await deleteAdminExperience(id, updatedAt)) updateTag("portfolio");
}
