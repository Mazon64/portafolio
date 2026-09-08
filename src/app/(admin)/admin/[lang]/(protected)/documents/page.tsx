import { getAdminDocumentWorkspace } from "@/data/admin/documents";
import { DocumentKind, DocumentStatus, Locale } from "@/generated/prisma/client";
import { getCvContent } from "@/data/portfolio";
import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";
import { createSourceHash } from "@/lib/documents/source-hash";
import { DocumentWorkspace } from "./document-workspace";
import { z } from "zod";

const filtersSchema = z.object({
  kind: z.enum(DocumentKind).optional().catch(undefined),
  locale: z.enum(Locale).optional().catch(undefined),
  status: z.enum(DocumentStatus).optional().catch(undefined),
  query: z.string().trim().max(100).optional().catch(undefined),
});

export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) return null;
  const requestedPage = Number.parseInt(
    typeof query.page === "string" ? query.page : "1",
    10,
  );
  const filters = filtersSchema.parse({
    kind: typeof query.kind === "string" ? query.kind : undefined,
    locale: typeof query.locale === "string" ? query.locale : undefined,
    status: typeof query.status === "string" ? query.status : undefined,
    query: typeof query.query === "string" && query.query.trim() ? query.query : undefined,
  });
  const [workspace, esSource, enSource] = await Promise.all([
    getAdminDocumentWorkspace(Number.isFinite(requestedPage) ? requestedPage : 1, filters),
    getCvContent("es"),
    getCvContent("en"),
  ]);
  const copy = adminCopy[lang].documents;
  return (
    <div>
      <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{copy.eyebrow}</p>
      <h1 className="mt-4 max-w-4xl text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">{copy.title}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-muted-foreground">{copy.description}</p>
      <DocumentWorkspace
        locale={lang}
        copy={copy}
        workspace={workspace}
        sourceHashes={{
          es: createSourceHash({
            portfolio: esSource,
            professionalContext: workspace.context?.professionalContext ?? "",
          }),
          en: createSourceHash({
            portfolio: enSource,
            professionalContext: workspace.context?.professionalContext ?? "",
          }),
        }}
      />
    </div>
  );
}
