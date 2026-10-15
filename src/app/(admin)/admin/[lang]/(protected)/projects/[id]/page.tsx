import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getAdminProjectIntegration } from "@/data/admin/project-integration";
import { hasLocale } from "@/i18n/config";
import { projectIntegrationCopy } from "@/i18n/project-integration";
import { projectIntegrationEnabled } from "@/lib/projects/configuration";
import { ProjectIntegrationPanel } from "../integration-panel";
import { getProjectDisclosure } from "@/data/admin/project-disclosure";
import { getPrisma } from "@/lib/prisma";
import { isCmsWriteEnabled } from "@/config/env";
import { DisclosurePanel } from "../disclosure-panel";
import { getPrivateSources } from "@/data/admin/project-repositories";
import { githubAppConfigured } from "@/lib/projects/github-app";
import { RepositoryPanel } from "../repository-panel";

export const maxDuration = 300;
export default async function ProjectIntegrationPage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id } = await params;
  if (!hasLocale(lang) || !z.uuid().safeParse(id).success) notFound();
  const copy = projectIntegrationCopy[lang];
  let workspace;
  try { workspace = await getAdminProjectIntegration(id); }
  catch (error) {
    if ((error as { code?: string }).code === "P2021") return <p>{copy.schemaPending}</p>;
    throw error;
  }
  if (!workspace) notFound();
  const disclosure = await getProjectDisclosure(id);
  const sources = disclosure ? await getPrivateSources(id) : [];
  const project = disclosure ? await getPrisma().project.findUniqueOrThrow({ where: { id }, select: { slug: true } }) : null;
  return <div>
    <Link href={`/admin/${lang}/projects`} className="text-sm text-muted-foreground">← {copy.back}</Link>
    <h1 className="mt-6 text-4xl font-semibold tracking-tight">{workspace.project.name}</h1>
    <p className="mt-3 text-muted-foreground">{copy.title}</p>
    <ProjectIntegrationPanel workspace={workspace} copy={copy} enabled={projectIntegrationEnabled()} />
    {disclosure && project && <DisclosurePanel projectId={id} slug={project.slug} {...disclosure} enabled={isCmsWriteEnabled()} locale={lang} />}
    {disclosure && <RepositoryPanel projectId={id} sources={sources} enabled={isCmsWriteEnabled() && githubAppConfigured()} locale={lang} />}
  </div>;
}
