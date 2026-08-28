import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ImageIcon,
} from "lucide-react";
import { FaGithub } from "react-icons/fa6";

import { buttonVariants } from "@/components/ui/button";
import type { ProjectDto, ProjectStatusDto } from "@/data/portfolio.types";
import { cn } from "@/lib/utils";

type ProjectCopy = {
  empty: string;
  imagePlaceholder: string;
  expand: string;
  progress: string;
  technologies: string;
  status: string;
  details: string;
  repository: string;
  prototype: string;
  newTab: string;
  statuses: Record<ProjectStatusDto, string>;
};

export function ProjectsSection({
  projects,
  copy,
}: {
  projects: ProjectDto[];
  copy: ProjectCopy;
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
        <p className="font-heading text-xl font-medium">{copy.empty}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {projects.map((project) => (
        <details
          key={project.slug}
          className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <summary className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <div className="grid lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
              <ProjectImagePlaceholder label={copy.imagePlaceholder} />
              <div className="flex min-h-64 flex-col p-6 sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-heading text-3xl font-semibold tracking-[-0.04em]">
                    {project.name}
                  </h3>
                  <ChevronDownIcon
                    aria-hidden="true"
                    className="mt-1 size-5 shrink-0 transition-transform group-open:rotate-180"
                  />
                </div>
                <p className="mt-4 max-w-2xl leading-7 text-muted-foreground">
                  {project.summary}
                </p>
                <div className="mt-auto pt-8">
                  <div className="mb-2 flex items-center justify-between text-xs font-medium">
                    <span>{copy.progress}</span>
                    <span>{project.progressPct}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={copy.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={project.progressPct}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${project.progressPct}%` }}
                    />
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    {copy.expand}
                  </p>
                </div>
              </div>
            </div>
          </summary>

          <div className="border-t border-border px-6 py-8 sm:px-8 lg:px-10">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(14rem,0.65fr)]">
              <div>
                <h4 className="font-heading text-xl font-semibold">
                  {copy.details}
                </h4>
                <div className="mt-4 space-y-4 leading-7 text-muted-foreground">
                  {project.detailedInfo.split(/\n+/).map((paragraph, index) => (
                    <p key={`${project.slug}-paragraph-${index}`}>{paragraph}</p>
                  ))}
                </div>
              </div>
              <aside className="space-y-8">
                <div>
                  <h4 className="text-sm font-semibold">{copy.status}</h4>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {copy.statuses[project.status]}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-semibold">{copy.technologies}</h4>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {project.techStack.map((technology) => (
                      <li
                        key={technology}
                        className="rounded-full border border-border px-3 py-1 text-xs"
                      >
                        {technology}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-3">
                  {project.repositoryUrl && (
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                    >
                      <FaGithub aria-hidden="true" />
                      {copy.repository}
                      <ArrowUpRightIcon aria-hidden="true" />
                      <span className="sr-only">{copy.newTab}</span>
                    </a>
                  )}
                  {project.demoUrl && (
                    <a
                      href={project.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(buttonVariants({ size: "lg" }))}
                    >
                      {copy.prototype}
                      <ArrowUpRightIcon aria-hidden="true" />
                      <span className="sr-only">{copy.newTab}</span>
                    </a>
                  )}
                </div>
              </aside>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

function ProjectImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="grid min-h-64 place-items-center border-b border-border bg-muted/40 lg:border-r lg:border-b-0">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <ImageIcon aria-hidden="true" className="size-9" />
        <span className="text-xs font-medium uppercase tracking-[0.15em]">
          {label}
        </span>
      </div>
    </div>
  );
}
