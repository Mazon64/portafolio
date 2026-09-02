import { z } from "zod";

import { getAdminDocumentArtifact } from "@/data/admin/documents";
import { DocumentKind } from "@/generated/prisma/client";
import { exportArtifactDocx, exportArtifactPdf } from "@/lib/documents/export";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format");
  if (!z.uuid().safeParse(id).success || (format !== "pdf" && format !== "docx")) {
    return new Response("Not found", { status: 404 });
  }

  const artifact = await getAdminDocumentArtifact(id);
  if (!artifact || artifact.kind === DocumentKind.PUBLIC_CV) {
    return new Response("Not found", { status: 404 });
  }

  const safeName = artifact.title
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "document";
  const body =
    format === "pdf"
      ? await exportArtifactPdf(artifact.kind, artifact.content)
      : new Uint8Array(await exportArtifactDocx(artifact.kind, artifact.content));
  const payload = new ArrayBuffer(body.byteLength);
  new Uint8Array(payload).set(body);
  return new Response(payload, {
    headers: {
      "content-type":
        format === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": `attachment; filename="${safeName}.${format}"`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
