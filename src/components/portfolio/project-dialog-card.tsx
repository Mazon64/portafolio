"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import Image from "next/image";
import { ArrowUpRightIcon, XIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ProjectDto } from "@/data/portfolio.types";
import type { Locale } from "@/i18n/config";
import { projectIntegrationCopy } from "@/i18n/project-integration";
import { MEDIA_CATEGORIES, type RepositoryAsset, type ProjectMilestones, type ProjectNarrative } from "@/lib/projects/schemas";
import type { ProjectCopy } from "./projects-section";
import { ProjectQuestion } from "./project-question";

type Extras = { assets: RepositoryAsset[]; milestones: ProjectMilestones; progressPct: number | null; sources: Array<{ path: string; sourceUrl: string }>; indexed: boolean; narrative: ProjectNarrative | null };

export function ProjectDialogCard({ project, extra, copy, locale, ragEnabled }: { project: ProjectDto; extra?: Extras; copy: ProjectCopy; locale: Locale; ragEnabled: boolean }) {
  const labels = projectIntegrationCopy[locale];
  const cover = extra?.assets[0];
  const progress = extra?.progressPct;
  return <article>
    <Dialog.Root>
      <Dialog.Trigger aria-label={`${labels.openProject} ${project.name}`} className={`group grid w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:border-foreground/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${cover ? "lg:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.15fr)]" : ""}`}>
        {cover && <span className="relative block aspect-[16/10] overflow-hidden bg-muted/30 lg:aspect-auto lg:min-h-72"><RepositoryImage asset={cover} locale={locale} fill /></span>}
        <span className="flex min-h-64 flex-col p-6 sm:p-8">
          <span className="flex items-start justify-between gap-4"><span role="heading" aria-level={3} className="font-heading text-3xl font-semibold tracking-[-0.04em]">{project.name}</span><ArrowUpRightIcon aria-hidden="true" className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" /></span>
          <span className="mt-4 block leading-7 text-muted-foreground">{project.summary}</span>
          <span className="mt-5 flex flex-wrap gap-2">{project.techStack.slice(0, 5).map((technology) => <span key={technology} className="rounded-full border border-border px-2.5 py-1 text-xs">{technology}</span>)}</span>
          <span className="mt-auto block pt-6">
            {progress != null ? <><span className="mb-2 flex justify-between text-xs"><span>{copy.progress}</span><span>{progress}%</span></span><span role="progressbar" aria-label={copy.progress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-foreground" style={{ width: `${progress}%` }} /></span></> : <span className="text-xs text-muted-foreground">{copy.statuses[project.status]}</span>}
            <span className="mt-4 block text-xs font-medium">{copy.expand}</span>
          </span>
        </span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background text-foreground shadow-2xl outline-none transition-[opacity,scale] duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[90dvh] sm:w-[min(72rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-border sm:data-starting-style:scale-95 sm:data-ending-style:scale-95 motion-reduce:transition-none">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background/95 p-5 backdrop-blur sm:px-8">
            <div><Dialog.Title className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</Dialog.Title><p className="mt-2 text-xs text-muted-foreground">{copy.statuses[project.status]}{progress != null && ` · ${progress}%`}</p></div>
            <Dialog.Close render={<Button variant="ghost" size="icon" />} aria-label={labels.closeModal}><XIcon aria-hidden="true" /></Dialog.Close>
          </div>
          <div className="p-5 sm:p-8">
            <Dialog.Description className="max-w-4xl text-lg leading-8 text-muted-foreground">{project.summary}</Dialog.Description>
            {extra?.assets.length ? <ProjectGallery assets={extra.assets} locale={locale} /> : null}
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(13rem,0.6fr)]">
              <div className="space-y-7">
                {extra?.narrative ? (["problem", "solution", "architecture", "decisions", "results"] as const).map((key) => <section key={key}><h3 className="text-xl font-semibold">{labels[key]}</h3><p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{extra.narrative![locale][key]}</p></section>) : <section><h3 className="text-xl font-semibold">{copy.details}</h3><p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{project.detailedInfo}</p></section>}
              </div>
              <aside className="space-y-7">
                <section><h3 className="font-semibold">{copy.technologies}</h3><ul className="mt-3 flex flex-wrap gap-2">{project.techStack.map((technology) => <li key={technology} className="rounded-full border border-border px-3 py-1 text-xs">{technology}</li>)}</ul></section>
                <div className="flex flex-wrap gap-3">{project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>{copy.repository}<ArrowUpRightIcon aria-hidden="true" /><span className="sr-only">{copy.newTab}</span></a>}{project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer" className={buttonVariants()}>{copy.prototype}<ArrowUpRightIcon aria-hidden="true" /><span className="sr-only">{copy.newTab}</span></a>}</div>
                {extra?.milestones.length ? <section><h3 className="font-semibold">{labels.milestones}</h3><ul className="mt-3 space-y-3">{extra.milestones.map((milestone) => <li key={milestone.id} className="rounded-xl border border-border p-3 text-sm"><p>{milestone.completed ? "✓" : "○"} {milestone.title[locale]}</p>{milestone.evidence && <a href={milestone.evidence} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs underline underline-offset-4">{labels.evidence.split(" (")[0]}</a>}</li>)}</ul></section> : null}
              </aside>
            </div>
            {extra?.sources.length ? <section className="mt-8 border-t border-border pt-6"><h3 className="font-semibold">{labels.published}</h3><ul className="mt-3 flex flex-wrap gap-3 text-xs">{extra.sources.map((source) => <li key={source.path}><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">{source.path}</a></li>)}</ul></section> : null}
            {extra?.indexed && ragEnabled && <ProjectQuestion slug={project.slug} locale={locale} />}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </article>;
}

function RepositoryImage({ asset, locale, fill = false }: { asset: RepositoryAsset; locale: Locale; fill?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="flex min-h-32 items-center justify-center p-4 text-sm text-muted-foreground">{projectIntegrationCopy[locale].imageUnavailable}</span>;
  return <Image src={asset.url} alt={asset.alt[locale]} {...(fill ? { fill: true } : { width: asset.width ?? 1280, height: asset.height ?? 800 })} sizes={fill ? "(min-width: 1024px) 45vw, 100vw" : "(min-width: 1024px) 70vw, 100vw"} onError={() => setFailed(true)} className={fill ? "object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transform-none" : "max-h-[65dvh] w-full rounded-xl object-contain"} />;
}

function ProjectGallery({ assets, locale }: { assets: RepositoryAsset[]; locale: Locale }) {
  const labels = projectIntegrationCopy[locale];
  const [category, setCategory] = useState<string>("all");
  const shown = assets.filter((asset) => category === "all" || asset.category === category);
  return <section className="mt-7" aria-label={labels.gallery}>
    <div className="mb-4 flex flex-wrap gap-2"><Button type="button" variant={category === "all" ? "secondary" : "ghost"} aria-pressed={category === "all"} onClick={() => setCategory("all")}>{labels.allImages}</Button>{MEDIA_CATEGORIES.filter((value) => assets.some((a) => a.category === value)).map((value) => <Button key={value} type="button" variant={category === value ? "secondary" : "ghost"} aria-pressed={category === value} onClick={() => setCategory(value)}>{labels.categories[value]}</Button>)}</div>
    <div className="grid gap-5">{shown.map((asset) => <figure key={asset.sourcePath} className="rounded-2xl border border-border bg-muted/20 p-3"><RepositoryImage asset={asset} locale={locale} /><figcaption className="mt-3 px-2 text-sm leading-6 text-muted-foreground"><span className="mr-2 font-medium">{labels.categories[asset.category]}.</span>{asset.caption[locale]}</figcaption></figure>)}</div>
  </section>;
}
