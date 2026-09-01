import { getAdminProjects } from "@/data/admin/projects";
import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";
import { NewProjectForm, ProjectForm } from "./project-form";

export default async function ProjectsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!hasLocale(lang)) return null;
  const projects = await getAdminProjects();
  const copy = adminCopy[lang].projects;
  return <div><p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{copy.eyebrow}</p><h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] sm:text-7xl">{copy.title}</h1><p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{copy.description}</p><div className="mt-12 space-y-6"><details open={projects.length === 0}><summary className="cursor-pointer font-mono text-sm font-medium">+ {copy.create}</summary><div className="mt-4"><NewProjectForm copy={copy} /></div></details>{projects.map((project) => <details key={project.id}><summary className="cursor-pointer py-3 text-lg font-medium">{project.en.name} · {copy.statuses[project.status]}</summary><ProjectForm project={project} copy={copy} /></details>)}</div></div>;
}
