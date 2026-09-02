import { getAdminDocumentWorkspace } from "@/data/admin/documents";
import { getCvContent } from "@/data/portfolio";
import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";
import { createSourceHash } from "@/lib/documents/source-hash";
import { DocumentWorkspace } from "./document-workspace";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) return null;
  const [workspace, esSource, enSource] = await Promise.all([
    getAdminDocumentWorkspace(),
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
