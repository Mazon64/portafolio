"use client";

import { useCallback, useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import Image from "next/image";
import { ArrowUpRightIcon, XIcon, CircleCheckIcon, CircleDashedIcon, FlagIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ProjectDto } from "@/data/portfolio.types";
import type { Locale } from "@/i18n/config";
import { projectIntegrationCopy } from "@/i18n/project-integration";
import { projectAtlasCopy } from "@/i18n/project-atlas";
import { disclosureLabels } from "@/i18n/project-disclosure";
import { type RepositoryAsset, type ProjectMilestones, type ProjectNarrative } from "@/lib/projects/schemas";
import type { ProjectCopy } from "./projects-section";
import { useSiteChat } from "@/components/chat/site-chat-context";

type Extras = { assets: RepositoryAsset[]; milestones: ProjectMilestones; progressPct: number | null; sources: Array<{ path: string; sourceUrl: string }>; indexed: boolean; narrative: ProjectNarrative | null; managed?: boolean };

export function ProjectDialogCard({ project, extra, copy, locale }: { project: ProjectDto; extra?: Extras; copy: ProjectCopy; locale: Locale }) {
  const labels = projectIntegrationCopy[locale];
  const atlas = projectAtlasCopy[locale];
  const narrative = extra?.narrative?.[locale];
  const areas = (["experience", "administration", "operations"] as const).filter((key) => narrative?.[key]);
  const progress = extra?.progressPct;
  const chat = useSiteChat();
  const setChatDock = chat.setDock;
  const attachChatDock = useCallback((node: HTMLDivElement | null) => setChatDock(node), [setChatDock]);
  const projectStatus = extra?.managed && project.status === "completed" ? "inProgress" : project.status;
  const [open, setOpen] = useState(false);
  const setViewedProject = chat.setProject;
  useEffect(() => {
    const followLink = () => {
      if (window.location.hash === `#project-${project.slug}`) { setOpen(true); setViewedProject(project.slug); }
    };
    followLink(); window.addEventListener("hashchange", followLink);
    return () => window.removeEventListener("hashchange", followLink);
  }, [project.slug, setViewedProject]);
  return <article id={`project-${project.slug}`}>
    <Dialog.Root open={open} onOpenChange={(open, details) => {
      if (!open && details.reason === "escape-key" && chat.open) { details.cancel(); chat.setOpen(false); return; }
      chat.setProject(open ? project.slug : null);
      setOpen(open);
      if (!open && window.location.hash === `#project-${project.slug}`) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }}>
      <Dialog.Trigger aria-label={`${labels.openProject} ${project.name}`} className="group grid w-full cursor-pointer overflow-hidden rounded-3xl border border-border bg-card text-left shadow-sm transition hover:border-foreground/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex min-h-64 flex-col p-6 sm:p-8">
          <span className="mb-6 text-xs uppercase tracking-[0.2em] text-muted-foreground">{atlas.atlas}</span>
          <span className="flex items-start justify-between gap-4"><span role="heading" aria-level={3} className="font-heading text-3xl font-semibold tracking-[-0.04em]">{project.name}</span><ArrowUpRightIcon aria-hidden="true" className="mt-1 size-5 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 motion-reduce:transform-none" /></span>
          <span className="mt-4 block leading-7 text-muted-foreground">{project.summary}</span>
          <span className="mt-5 flex flex-wrap gap-2">{project.techStack.map((technology) => <span key={technology} className="rounded-lg bg-muted/60 px-3 py-1.5 text-xs">{technology}</span>)}</span>
          {areas.length > 0 && <span className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">{areas.map((key, index) => <span key={key} className="text-xs text-muted-foreground"><span className="mr-2 font-mono">0{index + 1}</span>{atlas[key]}</span>)}</span>}
          <span className="mt-auto block pt-6">
            {project.statusVisible !== false && <span className="mb-3 block text-xs text-muted-foreground">{copy.statuses[projectStatus]}</span>}
            {progress != null && <><span className="mb-2 flex justify-between text-xs"><span>{labels.milestoneScope}</span><span>{progress}%</span></span><span role="progressbar" aria-label={labels.milestoneScope} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-emerald-500" style={{ width: `${progress}%` }} /></span></>}
            <span className="mt-4 block text-xs font-medium">{atlas.explore}</span>
          </span>
        </span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-starting-style:opacity-0 data-ending-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center text-foreground outline-none">
          <div className="pointer-events-auto flex h-full w-full flex-col overflow-hidden bg-background shadow-2xl sm:h-[90dvh] sm:max-h-[64rem] sm:w-[min(76rem,calc(100vw-3rem))] sm:rounded-3xl sm:border sm:border-border">
          <div className="z-10 flex shrink-0 items-start justify-between gap-4 border-b border-border bg-background/95 p-5 backdrop-blur sm:px-8">
            <div><p className="mb-1 text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{atlas.atlas}</p><Dialog.Title className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{project.name}</Dialog.Title>{project.statusVisible !== false && <p className="mt-2 text-xs text-muted-foreground">{copy.statuses[projectStatus]}</p>}</div>
            <Dialog.Close render={<Button variant="ghost" size="icon" />} aria-label={labels.closeModal}><XIcon aria-hidden="true" /></Dialog.Close>
          </div>
          <div data-project-scroll className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-24 sm:p-8 sm:pb-24">
            <Dialog.Description className="max-w-4xl font-heading text-2xl leading-relaxed tracking-tight sm:text-3xl">{project.summary}</Dialog.Description>
            <div className="mt-6 flex flex-wrap gap-3">{project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer" className={buttonVariants()}>{copy.prototype}<ArrowUpRightIcon aria-hidden="true" /><span className="sr-only">{copy.newTab}</span></a>}{project.repositoryUrl && <a href={project.repositoryUrl} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>{copy.repository}<ArrowUpRightIcon aria-hidden="true" /><span className="sr-only">{copy.newTab}</span></a>}</div>
            {project.techStack.length > 0 && <section className="mt-7 border-b border-border pb-7"><h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{copy.technologies}</h3><ul className="mt-3 flex flex-wrap gap-2">{project.techStack.map((technology) => <li key={technology} className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">{technology}</li>)}</ul></section>}
            <div className="mt-8 space-y-8">
              <div className="space-y-7">
                {project.participation && (project.participation.role || project.participation.period || project.participation.contribution || project.participation.relationship !== "UNSPECIFIED" || project.participation.status !== "UNSPECIFIED") && <section className="rounded-2xl border border-border p-5"><h3 className="text-xl font-semibold">{atlas.participation}</h3><div className="mt-3 flex flex-wrap gap-2">{[project.participation.relationship, project.participation.status].filter((value) => value !== "UNSPECIFIED").map((value) => <span key={value} className="rounded-full bg-muted px-3 py-1 text-xs">{disclosureLabels[locale][value]}</span>)}</div><p className="mt-2 font-medium">{project.participation.role}</p><p className="mt-1 text-sm text-muted-foreground">{project.participation.period}</p><p className="mt-3 whitespace-pre-line leading-7">{project.participation.contribution}</p></section>}
                {project.organizations?.length ? <section className="flex flex-wrap gap-4">{project.organizations.map((org, index) => <div key={index} className="flex items-center gap-3">{org.logoUrl && <Image src={org.logoUrl} alt="" width={48} height={48} unoptimized className="size-12 object-contain" />}<span>{org.name}</span></div>)}</section> : null}
                {narrative ? <section><h3 className="font-heading text-2xl font-semibold tracking-tight">{atlas.overview}</h3>
                  <div className="mt-5 grid gap-6 md:grid-cols-2">{(["problem", "solution"] as const).map((key) => <TextBlock key={key} title={labels[key]} text={narrative[key]} />)}</div>
                  {areas.length > 0 && <div className="mt-6 grid gap-4 lg:grid-cols-3">{areas.map((key, index) => <section key={key} className="rounded-2xl border border-border bg-muted/20 p-5"><span className="mb-5 block font-mono text-xs text-muted-foreground">0{index + 1}</span><TextBlock title={atlas[key]} text={narrative[key]!} /></section>)}</div>}
                  <div className="mt-6 rounded-2xl border border-border p-5 sm:p-6"><TextBlock title={labels.architecture} text={narrative.architecture} /></div>
                </section> : <section><h3 className="text-xl font-semibold">{copy.details}</h3><p className="mt-3 whitespace-pre-line leading-7 text-muted-foreground">{project.detailedInfo}</p></section>}
              </div>
              <div className="space-y-7">
                {!!extra?.milestones.length && <h3 className="border-t border-border pt-8 font-heading text-2xl font-semibold tracking-tight">{atlas.evolution}</h3>}
                {(["PROJECT", "CONTRIBUTION"] as const).map((scope) => { const milestones = extra?.milestones.filter((m) => (m.scope ?? "PROJECT") === scope) ?? []; return milestones.length ? <section key={scope}><h4 className="flex items-center gap-2 font-semibold"><FlagIcon className="size-4" aria-hidden="true" />{scope === "PROJECT" ? labels.milestones : atlas.contribution}</h4><p className="mt-2 text-xs text-muted-foreground">{milestones.filter((m) => m.completed).length} / {milestones.length} · {scope === "PROJECT" ? labels.milestoneScope : atlas.personalGoals}</p><ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{milestones.map((milestone) => <li key={milestone.id} className={`flex gap-3 rounded-xl border p-4 text-sm ${milestone.completed ? "border-emerald-500/25 bg-emerald-500/5" : "border-border bg-muted/20"}`}>
                  {milestone.completed ? <CircleCheckIcon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /> : <CircleDashedIcon className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />}
                  <div><p className="font-medium leading-6">{milestone.title[locale]}</p><span className={`mt-1 inline-block text-xs ${milestone.completed ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{milestone.completed ? labels.milestoneDone : milestone.assessment?.status === "unverified" ? labels.milestoneUnverified : labels.milestonePending}</span>{milestone.assessment && <p className="mt-2 text-xs leading-5 text-muted-foreground">{milestone.assessment.reason[locale]}</p>}{milestone.evidence && <a href={milestone.evidence} target="_blank" rel="noreferrer" className="mt-2 block text-xs underline underline-offset-4">{labels.evidence.split(" (")[0]}</a>}</div>
                </li>)}</ol>{milestones.some((m) => m.assessment) && <p className="mt-4 text-xs leading-5 text-muted-foreground">{labels.milestoneHint}</p>}</section> : null; })}
              </div>
              {narrative && <section className="border-t border-border pt-8"><h3 className="font-heading text-2xl font-semibold tracking-tight">{atlas.implementation}</h3><div className="mt-5 grid gap-6 md:grid-cols-2">{(["decisions", "results"] as const).map((key) => <TextBlock key={key} title={labels[key]} text={narrative[key]} />)}</div></section>}
              {!!extra?.assets.length && <section className="border-t border-border pt-8"><h3 className="font-heading text-2xl font-semibold tracking-tight">{atlas.gallery}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{atlas.galleryHint}</p><div className="mt-5 grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">{extra.assets.map((asset) => <StoryImage key={asset.sourcePath} asset={asset} locale={locale} />)}</div></section>}
            </div>
            {extra?.sources.length ? <section className="mt-8 border-t border-border pt-6"><h3 className="font-semibold">{labels.published}</h3><ul className="mt-3 flex flex-wrap gap-3 text-xs">{extra.sources.map((source) => <li key={source.path}><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">{source.path}</a></li>)}</ul></section> : null}
          </div>
          </div>
          <div ref={attachChatDock} data-chat-dock className="pointer-events-auto" />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  </article>;
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return <div><h4 className="font-semibold">{title}</h4><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{text}</p></div>;
}

function RepositoryImage({ asset, locale }: { asset: RepositoryAsset; locale: Locale }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="flex min-h-32 items-center justify-center p-4 text-sm text-muted-foreground">{projectIntegrationCopy[locale].imageUnavailable}</span>;
  return <Image src={asset.url} alt={asset.alt[locale]} unoptimized={asset.analysisPolicy === "disclosure"} width={asset.width ?? 1280} height={asset.height ?? 800} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" onError={() => setFailed(true)} className="aspect-[16/10] w-full rounded-xl object-contain" />;
}

function StoryImage({ asset, locale }: { asset: RepositoryAsset; locale: Locale }) {
  const labels = projectIntegrationCopy[locale];
  return <figure className="overflow-hidden rounded-2xl border border-border bg-muted/20"><a href={asset.url} target="_blank" rel="noreferrer" className="group relative block p-2" aria-label={`${labels.viewImage}: ${asset.alt[locale]}`}><RepositoryImage asset={asset} locale={locale} /><span className="absolute top-4 right-4 rounded-full border border-border bg-background/90 p-2 shadow-sm"><ArrowUpRightIcon className="size-4" aria-hidden="true" /></span></a><figcaption className="border-t border-border px-4 py-3 text-sm leading-6 text-muted-foreground"><span className="mr-2 text-xs font-semibold uppercase tracking-wide">{labels.categories[asset.category]}</span>{asset.caption[locale]}</figcaption></figure>;
}
