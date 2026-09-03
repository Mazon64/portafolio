"use server";

import { z } from "zod";

import { isCmsWriteEnabled, isDocumentGenerationEnabled } from "@/config/env";
import {
  createAiContextVersion,
  publishPublicCvArtifact,
} from "@/data/admin/documents";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  generateApplicationDocuments,
  generatePublicCvDraft,
} from "@/lib/documents/generate";
import { aiContextSchema, applicationDocumentSchema } from "./document-schema";

export type DocumentActionState = {
  status: "idle" | "success" | "invalid" | "disabled" | "unavailable" | "error";
};

async function canWrite() {
  try {
    await requireAdmin();
    return isCmsWriteEnabled();
  } catch {
    return false;
  }
}

export async function saveAiContextAction(
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!(await canWrite())) return { status: "disabled" };
  const result = aiContextSchema.safeParse({
    professionalContext: formData.get("professionalContext"),
    personalContext: formData.get("personalContext"),
  });
  if (!result.success) return { status: "invalid" };
  try {
    await createAiContextVersion(
      result.data.professionalContext,
      result.data.personalContext,
    );
    return { status: "success" };
  } catch (error) {
    console.error("Failed to save AI context", error);
    return { status: "error" };
  }
}

export async function generatePublicCvAction(
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!(await canWrite())) return { status: "disabled" };
  if (!isDocumentGenerationEnabled()) return { status: "unavailable" };
  const locale = z.enum(["es", "en"]).safeParse(formData.get("locale"));
  if (!locale.success) return { status: "invalid" };
  try {
    await generatePublicCvDraft(locale.data);
    return { status: "success" };
  } catch (error) {
    console.error("Failed to generate public CV", error);
    return { status: "error" };
  }
}

export async function generateApplicationAction(
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!(await canWrite())) return { status: "disabled" };
  if (!isDocumentGenerationEnabled()) return { status: "unavailable" };
  const result = applicationDocumentSchema.safeParse({
    locale: formData.get("locale"),
    company: formData.get("company"),
    role: formData.get("role"),
    sourceUrl: formData.get("sourceUrl"),
    jobDescription: formData.get("jobDescription"),
    notes: formData.get("notes"),
  });
  if (!result.success) return { status: "invalid" };
  try {
    await generateApplicationDocuments({
      ...result.data,
      sourceUrl: result.data.sourceUrl || null,
      notes: result.data.notes || null,
    });
    return { status: "success" };
  } catch (error) {
    console.error("Failed to generate application documents", error);
    return { status: "error" };
  }
}

export async function publishPublicCvAction(
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!(await canWrite())) return { status: "disabled" };
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { status: "invalid" };
  try {
    if (!(await publishPublicCvArtifact(id.data))) return { status: "invalid" };
    return { status: "success" };
  } catch (error) {
    console.error("Failed to publish public CV", error);
    return { status: "error" };
  }
}
