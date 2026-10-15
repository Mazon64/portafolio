"use server";
import { updateTag } from "next/cache";
import { saveProjectDisclosure } from "@/data/admin/project-disclosure";
import { connectPrivateSource, importPrivateEvidence } from "@/data/admin/project-repositories";
import { revalidatePath } from "next/cache";
import { storeProjectMedia } from "@/data/admin/project-media";
import { ZodError } from "zod";

export async function uploadProjectMediaAction(_previous: { status: string; id?: string }, form: FormData) {
  try {
    const result = await storeProjectMedia(String(form.get("projectId") ?? ""), form.get("image") as File);
    return { status: "success", id: result.id };
  } catch { return { status: "error" }; }
}

export async function connectSourceAction(_previous: { status: string }, form: FormData) {
  try {
    const result = await connectPrivateSource({ projectId: form.get("projectId"), repositoryId: form.get("repositoryId"), installationId: form.get("installationId"), paths: String(form.get("paths") ?? "").split(/\r?\n/).map((path) => path.trim()).filter(Boolean) });
    await importPrivateEvidence(result.id);
    revalidatePath("/admin/[lang]/projects/[id]", "page");
    return { status: "success" };
  } catch { return { status: "error" }; }
}

export async function refreshSourceAction(_previous: { status: string }, form: FormData) {
  try {
    await importPrivateEvidence(String(form.get("id") ?? ""));
    revalidatePath("/admin/[lang]/projects/[id]", "page");
    return { status: "success" };
  } catch { return { status: "error" }; }
}

export async function saveDisclosureAction(_previous: { status: string; revision: string }, form: FormData) {
  let saved;
  try {
    const raw = String(form.get("policy") ?? "");
    if (raw.length > 100_000) return { ..._previous, status: "invalid" };
    saved = await saveProjectDisclosure({ projectId: form.get("projectId"), revision: form.get("revision"), publicSlug: form.get("publicSlug"), policy: JSON.parse(raw) });
    if (!saved) return { ..._previous, status: "conflict" };
  } catch (error) { return { ..._previous, status: error instanceof ZodError || error instanceof SyntaxError ? "invalid" : "error" }; }
  try { updateTag("portfolio"); revalidatePath("/admin/[lang]/projects/[id]", "page"); } catch { return { ...saved, status: "cache-error" }; }
  return { ...saved, status: "success" };
}
