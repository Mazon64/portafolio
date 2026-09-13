import type { Locale } from "@/i18n/config";
import { getPublicProjectExtras } from "@/data/project-knowledge";
import { projectRagEnabled } from "@/lib/projects/configuration";
import type { ProjectDto, ProjectStatusDto } from "@/data/portfolio.types";
import { ProjectDialogCard } from "./project-dialog-card";

export type ProjectCopy = {
  empty: string; imagePlaceholder: string; expand: string; progress: string;
  technologies: string; status: string; details: string; repository: string;
  prototype: string; newTab: string; statuses: Record<ProjectStatusDto, string>;
};

export async function ProjectsSection({ projects, copy, locale }: { projects: ProjectDto[]; copy: ProjectCopy; locale: Locale }) {
  if (!projects.length) return <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center"><p className="font-heading text-xl font-medium">{copy.empty}</p></div>;
  const extras = await getPublicProjectExtras(projects.map((project) => project.slug));
  return <div className="grid gap-6">{projects.map((project) =>
    <ProjectDialogCard key={project.slug} project={project} extra={extras[project.slug]} locale={locale} copy={copy} ragEnabled={projectRagEnabled()} />,
  )}</div>;
}
