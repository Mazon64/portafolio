import { getAdminProjects } from "@/data/admin/projects";
import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";
import { ProjectForm } from "./project-form";
import { DeleteForm } from "@/components/admin/delete-form";
import { deleteProjectAction } from "./actions";
import Link from "next/link";
import { projectIntegrationCopy } from "@/i18n/project-integration";
import { projectIntegrationEnabled } from "@/lib/projects/configuration";
import { Suspense } from "react";
import { listRepositoryCandidates } from "@/data/admin/project-integration";
import { PortfolioPilot, RepositoryCandidateList } from "./integration-panel";
import type { Locale } from "@/i18n/config";

async function Candidates({ locale }: { locale: Locale }) {
  let data;
  try { data = await listRepositoryCandidates(); } catch { data = { candidates: [], warnings: ["UNAVAILABLE"] }; }
  const slug = process.env.GITHUB_APP_SLUG?.trim();
  const installUrl = slug && /^[a-z0-9-]{1,100}$/.test(slug) ? `https://github.com/apps/${slug}/installations/new` : null;
  return <RepositoryCandidateList locale={locale} copy={projectIntegrationCopy[locale]} enabled={projectIntegrationEnabled()} data={data} installUrl={installUrl} />;
}

export default async function ProjectsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) return null;
  const projects = await getAdminProjects();
  const copy = adminCopy[lang].projects;
  return <div>
    <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{copy.eyebrow}</p>
    <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">{copy.title}</h1>
    <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{copy.description}</p>
    <PortfolioPilot locale={lang} copy={projectIntegrationCopy[lang]} enabled={projectIntegrationEnabled()} />
    <Suspense fallback={<p className="my-6 text-sm text-muted-foreground">{projectIntegrationCopy[lang].working}</p>}><Candidates locale={lang} /></Suspense>
    <div className="mt-12 space-y-6">
      {projects.map((project) => <details key={project.id}>
        <summary className="cursor-pointer py-3 text-lg font-medium">{project.en.name} · {copy.statuses[project.status]}</summary>
        <Link href={`/admin/${lang}/projects/${project.id}`} className="mb-4 inline-block text-sm underline underline-offset-4">{projectIntegrationCopy[lang].manage}</Link>
        {project.integrationManaged ? <DeleteForm action={deleteProjectAction} id={project.id} updatedAt={project.updatedAt} label={copy.remove} confirmText={copy.confirmDelete} messages={copy.deleteStatus} /> : <ProjectForm project={project} copy={copy} />}
      </details>)}
    </div>
  </div>;
}
