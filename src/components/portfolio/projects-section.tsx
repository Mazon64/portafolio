import {
  ArrowUpRightIcon,
  ChevronDownIcon,
  ImageIcon,
} from "lucide-react";
import { FaGithub } from "react-icons/fa6";
import Image from "next/image";
import type { Locale } from "@/i18n/config";
import { getPublicProjectExtras } from "@/data/project-knowledge";
import { projectRagEnabled } from "@/lib/projects/configuration";
import { projectIntegrationCopy } from "@/i18n/project-integration";
import { ProjectQuestion } from "./project-question";

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

export async function ProjectsSection({
  projects,
  copy,
  locale,
}: {
  projects: ProjectDto[];
  copy: ProjectCopy;
  locale: Locale;
}) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
        <p className="font-heading text-xl font-medium">{copy.empty}</p>
      </div>
    );
  }

  const extras = await getPublicProjectExtras(projects.map((project) => project.slug));
  const integrationCopy = projectIntegrationCopy[locale];

  return (
    <div className="grid gap-6">
      {projects.map((project) => {
        const extra = extras[project.slug];
        const cover = extra?.assets[0];
        const progress = extra?.progressPct ?? project.progressPct;
        return (
        <details
          key={project.slug}
          className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
        >
          <summary className="cursor-pointer list-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <div className="grid lg:grid-cols-[minmax(16rem,0.8fr)_minmax(0,1.2fr)]">
              {cover ? <div className="relative min-h-64 border-b border-border bg-muted/40 lg:border-r lg:border-b-0"><Image src={cover.url} alt={cover.alt[locale]} fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-contain p-4" /></div> : <ProjectImagePlaceholder label={copy.imagePlaceholder} />}
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
                    <span>{progress}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={copy.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${progress}%` }}
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
            {cover && <p className="mb-6 text-sm text-muted-foreground">{cover.caption[locale]}</p>}
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
            {extra && extra.assets.length > 1 && <div className="mt-8 grid gap-5 sm:grid-cols-2">{extra.assets.slice(1).map((asset, index) => <figure key={`${asset.url}-${index}`}><Image src={asset.url} alt={asset.alt[locale]} width={1200} height={750} className="h-auto w-full rounded-xl border border-border" /><figcaption className="mt-2 text-sm text-muted-foreground">{asset.caption[locale]}</figcaption></figure>)}</div>}
            {extra && extra.milestones.length > 0 && <section className="mt-8"><h4 className="text-lg font-semibold">{integrationCopy.progress}</h4><ul className="mt-4 grid gap-3 sm:grid-cols-2">{extra.milestones.map((milestone) => <li key={milestone.id} className="rounded-lg border border-border p-3 text-sm"><span aria-hidden="true">{milestone.completed ? "✓" : "○"} </span>{milestone.title[locale]} · {milestone.weight}{milestone.evidence && <a href={milestone.evidence} target="_blank" rel="noreferrer" className="ml-3 underline underline-offset-4">{integrationCopy.evidence.split(" (")[0]}</a>}</li>)}</ul></section>}
            {extra && extra.sources.length > 0 && <section className="mt-8"><h4 className="text-lg font-semibold">{integrationCopy.published}</h4><ul className="mt-3 flex flex-wrap gap-3 text-sm">{extra.sources.map((source) => <li key={source.path}><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.path}</a></li>)}</ul></section>}
            {extra?.indexed && projectRagEnabled() && <ProjectQuestion slug={project.slug} locale={locale} />}
          </div>
        </details>
      ); })}
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
