"use server";

import { z } from "zod";

import { isCmsWriteEnabled, isDocumentGenerationEnabled } from "@/config/env";
import {
  createAiContextVersion,
  publishPublicCvArtifact,
} from "@/data/admin/documents";
import { requireAdmin } from "@/lib/auth/authorization";
import {
  DocumentSourceConflictError,
  InvalidDocumentDraftError,
  generateApplicationDocuments,
  generatePublicCvDraft,
  saveApplicationDocuments,
  savePublicCvDraft,
} from "@/lib/documents/generate";
import type {
  ApplicationDocumentsDraft,
  PublicCvDraft,
} from "@/lib/documents/generate";
import {
  atsGenerationSchema,
  coverLetterGenerationSchema,
  publicCvGenerationSchema,
} from "@/lib/documents/schemas";
import { aiContextSchema, applicationDocumentSchema } from "./document-schema";

export type DocumentActionState = {
  status:
    | "idle"
    | "generated"
    | "success"
    | "invalid"
    | "disabled"
    | "unavailable"
    | "conflict"
    | "error";
  publicDraft?: PublicCvDraft;
  applicationDraft?: ApplicationDocumentsDraft;
};

const draftMetadataSchema = z.object({
  draftId: z.uuid(),
  locale: z.enum(["es", "en"]),
  sourceHash: z.string().regex(/^[a-f0-9]{64}$/),
  model: z.string().trim().min(1).max(200),
  proof: z.string().regex(/^[a-f0-9]{64}$/),
});

function strings(formData: FormData, name: string) {
  return formData.getAll(name).filter((value): value is string => typeof value === "string");
}

function lines(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    : [];
}

function paragraphs(value: FormDataEntryValue | null) {
  return typeof value === "string"
    ? value.split(/\r?\n\s*\r?\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];
}

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
    const publicDraft = await generatePublicCvDraft(locale.data);
    return { status: "generated", publicDraft };
  } catch (error) {
    console.error("Failed to generate public CV", error);
    return { status: "error" };
  }
}

export async function savePublicCvDraftAction(
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!(await canWrite())) return { status: "disabled" };
  if (!isDocumentGenerationEnabled()) return { status: "unavailable" };
  const metadata = draftMetadataSchema.safeParse({
    draftId: formData.get("draftId"),
    locale: formData.get("locale"),
    sourceHash: formData.get("sourceHash"),
    model: formData.get("model"),
    proof: formData.get("proof"),
  });
  const experienceSlugs = strings(formData, "experienceSlug");
  const experienceDescriptions = strings(formData, "experienceDescription");
  const projectSlugs = strings(formData, "projectSlug");
  const projectSummaries = strings(formData, "projectSummary");
  const content = publicCvGenerationSchema.safeParse({
    summary: formData.get("summary"),
    experience: experienceSlugs.map((slug, index) => ({
      slug,
      description: experienceDescriptions[index],
    })),
    projects: projectSlugs.map((slug, index) => ({
      slug,
      summary: projectSummaries[index],
    })),
  });
  if (!metadata.success || !content.success) return { status: "invalid" };
  try {
    await savePublicCvDraft({ ...metadata.data, content: content.data });
    return { status: "success" };
  } catch (error) {
    if (error instanceof DocumentSourceConflictError) return { status: "conflict" };
    if (error instanceof InvalidDocumentDraftError) return { status: "invalid" };
    console.error("Failed to save public CV draft", error);
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
    const applicationDraft = await generateApplicationDocuments({
      ...result.data,
      sourceUrl: result.data.sourceUrl || null,
      notes: result.data.notes || null,
    });
    return { status: "generated", applicationDraft };
  } catch (error) {
    console.error("Failed to generate application documents", error);
    return { status: "error" };
  }
}

export async function saveApplicationDocumentsAction(
  _state: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  if (!(await canWrite())) return { status: "disabled" };
  if (!isDocumentGenerationEnabled()) return { status: "unavailable" };
  const metadata = draftMetadataSchema.safeParse({
    draftId: formData.get("draftId"),
    locale: formData.get("locale"),
    sourceHash: formData.get("sourceHash"),
    model: formData.get("model"),
    proof: formData.get("proof"),
  });
  const application = applicationDocumentSchema.safeParse({
    locale: formData.get("locale"),
    company: formData.get("company"),
    role: formData.get("role"),
    sourceUrl: formData.get("sourceUrl"),
    jobDescription: formData.get("jobDescription"),
    notes: formData.get("notes"),
  });
  const experienceSlugs = strings(formData, "experienceSlug");
  const experienceBullets = strings(formData, "experienceBullets");
  const projectSlugs = strings(formData, "projectSlug");
  const projectBullets = strings(formData, "projectBullets");
  const ats = atsGenerationSchema.safeParse({
    headline: formData.get("headline"),
    summary: formData.get("summary"),
    skills: strings(formData, "skill"),
    experience: experienceSlugs.map((slug, index) => ({
      slug,
      bullets: lines(experienceBullets[index] ?? null),
    })),
    projects: projectSlugs.map((slug, index) => ({
      slug,
      bullets: lines(projectBullets[index] ?? null),
    })),
  });
  const cover = coverLetterGenerationSchema.safeParse({
    subject: formData.get("subject"),
    salutation: formData.get("salutation"),
    paragraphs: paragraphs(formData.get("paragraphs")),
    closing: formData.get("closing"),
  });
  if (!metadata.success || !application.success || !ats.success || !cover.success) {
    return { status: "invalid" };
  }
  try {
    await saveApplicationDocuments({
      application: {
        ...application.data,
        sourceUrl: application.data.sourceUrl || null,
        notes: application.data.notes || null,
      },
      draftId: metadata.data.draftId,
      sourceHash: metadata.data.sourceHash,
      model: metadata.data.model,
      proof: metadata.data.proof,
      ats: ats.data,
      cover: cover.data,
    });
    return { status: "success" };
  } catch (error) {
    if (error instanceof DocumentSourceConflictError) return { status: "conflict" };
    if (error instanceof InvalidDocumentDraftError) return { status: "invalid" };
    console.error("Failed to save application documents", error);
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
