"use client";

import { useCallback, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import Image from "next/image";
import { ArrowUpRightIcon, XIcon, CircleCheckIcon, CircleDashedIcon, FlagIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ProjectDto } from "@/data/portfolio.types";
import type { Locale } from "@/i18n/config";
import { projectIntegrationCopy } from "@/i18n/project-integration";
import { type RepositoryAsset, type ProjectMilestones, type ProjectNarrative } from "@/lib/projects/schemas";
import type { ProjectCopy } from "./projects-section";
import { useSiteChat } from "@/components/chat/site-chat-context";

type Extras = { assets: RepositoryAsset[]; milestones: ProjectMilestones; progressPct: number | null; sources: Array<{ path: string; sourceUrl: string }>; indexed: boolean; narrative: ProjectNarrative | null; managed?: boolean };

export function ProjectDialogCard({ project, extra, copy, locale }: { project: ProjectDto; extra?: Extras; copy: ProjectCopy; locale: Locale }) {
  const labels = projectIntegrationCopy[locale];
  const cover = extra?.assets[0];
  const progress = extra?.progressPct;
  const chat = useSiteChat();
  const setChatDock = chat.setDock;
  const attachChatDock = useCallback((node: HTMLDivElement | null) => setChatDock(node), [setChatDock]);
  const projectStatus = extra?.managed && project.status === "completed" ? "inProgress" : project.status;
  return <article id={`project-${project.slug}`}>
    <Dialog.Root onOpenChange={(open, details) => {
      if (!open && details.reason === "escape-key" && chat.open) { details.cancel(); chat.setOpen(false); return; }
      chat.setProject(open ? project.slug : null);
    }}>
      <Dialog.Trigger aria-label={`${labels.openProject} ${project.name}`} className={`group grid w-full cursor-pointer overflow-hidden rounded-2xl border border-border bg-card text-left shadow-sm transition hover:border-foreground/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${cover ? "lg:grid-cols-[minmax(16rem,0.85fr)_minmax(0,1.15fr)]" : ""}`}>
        {cover && <span className="relative block aspect-[16/10] overflow-hidden bg-muted/30 lg:aspect-auto lg:min-h-72"><RepositoryImage asset={cover} locale={locale} fill /></span>}
        <span className="flex min-h-64 flex-col p-6 sm:p-8">
          <span className="flex items-start justify-between gap-4"><span role="heading" aria-level={3} className="font-heading text-3xl font-semibold tracking-[-0.04em]">{project.name}</span><ArrowUpRightIcon aria-hidden="true" className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" /></span>
          <span className="mt-4 block leading-7 text-muted-foreground">{project.summary}</span>
          <span className="mt-5 flex flex-wrap gap-2">{project.techStack.slice(0, 5).map((technology) => <span key={technology} className="rounded-full border border-border px-2.5 py-1 text-xs">{technology}</span>)}</span>
          <span className="mt-auto block pt-6">
            <span className="mb-3 block text-xs text-muted-foreground">{copy.statuses[projectStatus]}</span>
            {progress != null && <><span className="mb-2 flex justify-between text-xs"><span>{labels.milestoneScope}</span><span>{progress}%</span></span><span role="progressbar" aria-label={labels.milestoneScope} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-emerald-500" style={{ width: `${progress}%` }} /></span></>}
            <span className="mt-4 block text-xs font-medium">{copy.expand}</span>
          </span>
        </span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background text-foreground shadow-2xl outline-none transition-[opacity,scale] duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[90dvh] sm:max-h-[64rem] sm:w-[min(76rem,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:border sm:border-border sm:data-starting-style:scale-95 sm:data-ending-style:scale-95 motion-reduce:transition-none">
          <div className="z-10 flex shrink-0 items-start justify-between gap-4 border-b border-border bg-background/95 p-5 backdrop-blur sm:px-8">
            <div><Dialog.Title className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</Dialog.Title><p className="mt-2 text-xs text-muted-foreground">{copy.statuses[projectStatus]}</p></div>
            <Dialog.Close render={<Button variant="ghost" size="icon" />} aria-label={labels.closeModal}><XIcon aria-hidden="true" /></Dialog.Close>
          </div>
          <div data-project-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-24 sm:p-8 sm:pb-24">
            <div className={`grid items-center gap-6 ${cover?.category === "interface" ? "lg:grid-cols-2" : ""}`}><Dialog.Description className="max-w-4xl text-lg leading-8 text-muted-foreground">{project.summary}</Dialog.Description>{cover?.category === "interface" && <StoryImage asset={cover} locale={locale} />}</div>
            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(13rem,0.6fr)]">
              <div className="space-y-7">
                {extra?.narrative ? (["problem", "solution", "architecture", "decisions", "results"] as const).map((key) => <section key={key}>
                  <h3 className="text-xl font-semibold">{labels[key]}</h3><p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{extra.narrative![locale][key]}</p>
                  <div className="mt-5 space-y-5">{extra.assets.filter((asset) => {
                    if (asset === cover && cover.category === "interface") return false;
                    return key === "solution" ? ["interface", "features"].includes(asset.category) : key === "architecture" ? asset.category === "diagrams" : key === "results" ? asset.category === "results" : false;
                  }).map((asset) => <StoryImage key={asset.sourcePath} asset={asset} locale={locale} />)}</div>
                </section>) : <section><h3 className="text-xl font-semibold">{copy.details}</h3><p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{project.detailedInfo}</p><div className="mt-5 space-y-5">{extra?.assets.filter((asset) => asset !== cover || cover.category !== "interface").map((asset) => <StoryImage key={asset.sourcePath} asset={asset} locale={locale} />)}</div></section>}
              </div>
              <aside className="space-y-7">
                <section><h3 className="font-semibold">{copy.technologies}</h3><ul className="mt-3 flex flex-wrap gap-2">{project.techStack.map((technology) => <li key={technology} className="rounded-full border border-border px-3 py-1 text-xs">{technology}</li>)}</ul></section>
                <div className="flex flex-wrap gap-3">{project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>{copy.repository}<ArrowUpRightIcon aria-hidden="true" /><span className="sr-only">{copy.newTab}</span></a>}{project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer" className={buttonVariants()}>{copy.prototype}<ArrowUpRightIcon aria-hidden="true" /><span className="sr-only">{copy.newTab}</span></a>}</div>
                {extra?.milestones.length ? <section className="rounded-2xl border border-border p-4"><h3 className="flex items-center gap-2 font-semibold"><FlagIcon className="size-4" />{labels.milestones}</h3><p className="mt-2 text-xs text-muted-foreground">{extra.milestones.filter((m) => m.completed).length} / {extra.milestones.length} · {labels.milestoneScope}</p><ol className="mt-5 space-y-3">{extra.milestones.map((milestone) => <li key={milestone.id} className={`flex gap-3 rounded-xl border p-3 text-sm ${milestone.completed ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5"}`}>
                  {milestone.completed ? <CircleCheckIcon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> : <CircleDashedIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                  <div><p className="font-medium leading-6">{milestone.title[locale]}</p><span className={`mt-1 inline-block text-xs ${milestone.completed ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{milestone.completed ? labels.milestoneDone : labels.milestonePending}</span>{milestone.evidence && <a href={milestone.evidence} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline underline-offset-4">{labels.evidence.split(" (")[0]}</a>}</div>
                </li>)}</ol></section> : null}
              </aside>
            </div>
            {extra?.sources.length ? <section className="mt-8 border-t border-border pt-6"><h3 className="font-semibold">{labels.published}</h3><ul className="mt-3 flex flex-wrap gap-3 text-xs">{extra.sources.map((source) => <li key={source.path}><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">{source.path}</a></li>)}</ul></section> : null}
          </div>
          <div ref={attachChatDock} data-chat-dock />
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

function StoryImage({ asset, locale }: { asset: RepositoryAsset; locale: Locale }) {
  const labels = projectIntegrationCopy[locale];
  return <figure className="overflow-hidden rounded-2xl border border-border bg-muted/20"><a href={asset.url} target="_blank" rel="noreferrer" className="group relative block p-2" aria-label={`${labels.viewImage}: ${asset.alt[locale]}`}><RepositoryImage asset={asset} locale={locale} /><span className="absolute top-4 right-4 rounded-full border border-border bg-background/90 p-2 shadow-sm"><ArrowUpRightIcon className="size-4" aria-hidden="true" /></span></a><figcaption className="border-t border-border px-4 py-3 text-sm leading-6 text-muted-foreground"><span className="mr-2 text-xs font-semibold uppercase tracking-wide">{labels.categories[asset.category]}</span>{asset.caption[locale]}</figcaption></figure>;
}
