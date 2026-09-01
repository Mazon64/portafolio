"use server";

import { updateTag } from "next/cache";

import { isCmsWriteEnabled } from "@/config/env";
import { updateAdminProfile } from "@/data/admin/profile";
import { hasLocale } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth/authorization";
import type { ProfileFormState } from "./profile-form-state";
import { createProfileSchema } from "./profile-schema";

function withCurrentVersion(
  state: ProfileFormState,
  status: "disabled" | "error",
): ProfileFormState {
  return state.updatedAt ? { status, updatedAt: state.updatedAt } : { status };
}

export async function updateProfileAction(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  try {
    await requireAdmin();
  } catch {
    return withCurrentVersion(_state, "error");
  }

  if (!isCmsWriteEnabled()) return withCurrentVersion(_state, "disabled");

  const requestedLocale = String(formData.get("uiLocale") ?? "");
  const locale = hasLocale(requestedLocale) ? requestedLocale : "en";
  const result = createProfileSchema(locale).safeParse({
    updatedAt: formData.get("updatedAt"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    esTitle: formData.get("esTitle"),
    esLongBio: formData.get("esLongBio"),
    esContactText: formData.get("esContactText"),
    enTitle: formData.get("enTitle"),
    enLongBio: formData.get("enLongBio"),
    enContactText: formData.get("enContactText"),
  });

  if (!result.success) {
    return {
      status: "invalid",
      errors: result.error.flatten().fieldErrors,
      updatedAt: _state.updatedAt,
    };
  }

  try {
    const value = result.data;
    const updatedAt = await updateAdminProfile({
      updatedAt: value.updatedAt,
      fullName: value.fullName,
      email: value.email,
      es: {
        title: value.esTitle,
        longBio: value.esLongBio,
        contactText: value.esContactText,
      },
      en: {
        title: value.enTitle,
        longBio: value.enLongBio,
        contactText: value.enContactText,
      },
    });
    if (!updatedAt) return { status: "conflict" };

    try {
      updateTag("portfolio");
    } catch (error) {
      console.error("Profile saved, but public cache invalidation failed", error);
      return { status: "cache-error", updatedAt };
    }
    return { status: "success", updatedAt };
  } catch (error) {
    console.error("Failed to update the main profile", error);
    return withCurrentVersion(_state, "error");
  }
}
