"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheckIcon, CircleDashedIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProjectIntegrationWorkspace } from "@/data/admin/project-integration";
import type { ProjectIntegrationCopy } from "@/i18n/project-integration";
import type { Locale } from "@/i18n/config";
import { milestoneProgress } from "@/lib/projects/schemas";
import { projectIntegrationAction, type ProjectIntegrationState } from "./integration-actions";

const initial: ProjectIntegrationState = { status: "idle" };
const field = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const panel = "rounded-2xl border border-border bg-card p-6";
async function configurationAction(previous: ProjectIntegrationState, data: FormData) {
  return { ...previous, ...await projectIntegrationAction(previous, data) };
}
function Feedback({ state, copy }: { state: ProjectIntegrationState; copy: ProjectIntegrationCopy }) {
  return state.status !== "idle" ? <p role="status" className="mt-3 text-sm text-muted-foreground">{copy.statuses[state.status]}</p> : null;
}

export function PortfolioPilot({ locale, copy, enabled }: { locale: Locale; copy: ProjectIntegrationCopy; enabled: boolean }) {
  const [state, action, pending] = useActionState(projectIntegrationAction, initial);
  const router = useRouter();
  useEffect(() => { if (state.projectId) router.push(`/admin/${locale}/projects/${state.projectId}`); }, [state.projectId, router, locale]);
  return <form action={action} className={`${panel} my-6`}>
    <input type="hidden" name="operation" value="connect" />
    <p className="mb-4 text-sm text-muted-foreground">{copy.automaticHint}</p>
    <label className="block text-sm font-medium">{copy.repository}<input name="repositoryFullName" className={field} placeholder="Mazon64/portafolio" required disabled={!enabled || pending} /></label>
    <Button type="submit" variant="outline" className="mt-4" disabled={!enabled || pending}>{pending ? copy.working : copy.connect}</Button>
    <Feedback state={state} copy={copy} />
  </form>;
}

export function ProjectIntegrationPanel({ workspace, copy, enabled }: { workspace: ProjectIntegrationWorkspace; copy: ProjectIntegrationCopy; enabled: boolean }) {
  const router = useRouter();
  const published = workspace.published;
  return <div className="mt-8 space-y-6">
    {!enabled && <p className="text-sm text-muted-foreground">{copy.disabled}</p>}
    <p className="text-sm leading-7 text-muted-foreground">{copy.automaticHint}</p>
    <Configuration key={workspace.project.id} workspace={workspace} copy={copy} enabled={enabled} />
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-semibold">{copy.jobs}</h2><Button variant="ghost" onClick={() => router.refresh()}>{copy.refresh}</Button></div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Operation projectId={workspace.project.id} operation="sync" label={copy.sync} copy={copy} enabled={enabled && Boolean(workspace.integration?.enabled)} />
        <Operation projectId={workspace.project.id} operation="process" label={copy.process} copy={copy} enabled={enabled && Boolean(workspace.integration?.enabled)} />
      </div>
      <ul className="mt-5 divide-y divide-border">{workspace.jobs.map((job) => <li key={job.id} className="py-4 text-sm">
        <p>{copy.jobStatuses[job.status as keyof typeof copy.jobStatuses] ?? job.status} · {copy.attempts}: {job.attempts}</p>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{job.createdAt}{job.requestedSha && ` · ${job.requestedSha.slice(0, 10)}`}</p>
        {job.error && <p className="mt-1 text-muted-foreground">{job.error} · {copy.nextAttempt}: {job.availableAt}</p>}
        {job.status === "FAILED" && <Operation projectId={workspace.project.id} operation="retry" jobId={job.id} label={copy.retry} copy={copy} enabled={enabled} />}
      </li>)}</ul>
      {!workspace.jobs.length && <p className="mt-5 text-muted-foreground">{copy.noJobs}</p>}
    </section>
    <section className={panel}>
      <h2 className="text-xl font-semibold">{copy.published}</h2>
      {published ? <>
        <p className="mt-3 font-mono text-xs text-muted-foreground">{published.commitSha.slice(0, 10)} · {published.publishedAt}</p>
        <ul className="mt-4 flex flex-wrap gap-3 text-sm">{published.sources.map((source) => <li key={source.path}><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.path}</a></li>)}</ul>
        {published.snapshot && <div className="mt-6 space-y-4 text-sm">
          <p>{published.snapshot.metadata.techStack.join(" · ")}</p>
          <p>{copy.progress}: {milestoneProgress(published.snapshot.milestones) === null ? copy.progressUnknown : `${milestoneProgress(published.snapshot.milestones)}%`}</p>
          <p>{copy.assets}: {published.snapshot.assets.length} · {copy.mediaRoot}</p>
          <p className="text-muted-foreground">{copy.milestoneHint}</p>
          <ul className="space-y-4">{published.snapshot.milestones.map((m) => <li key={m.id} className="flex items-start gap-2">{m.completed ? <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label={copy.milestoneDone} /> : <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-label={m.assessment?.status === "unverified" ? copy.milestoneUnverified : copy.milestonePending} />}<div><p>{m.title.es} / {m.title.en}</p><p className="mt-1 text-xs">{m.completed ? copy.milestoneDone : m.assessment?.status === "unverified" ? copy.milestoneUnverified : copy.milestonePending}</p>{m.assessment && <><p className="mt-2 text-muted-foreground">{m.assessment.reason.es} / {m.assessment.reason.en}</p><ul className="mt-2 space-y-2">{m.assessment.citations.map((citation, index) => <li key={`${citation.sourceHash}-${index}`}><a href={citation.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{citation.path}</a><blockquote className="mt-1 border-l border-border pl-3 text-xs text-muted-foreground">{citation.quote}</blockquote></li>)}</ul></>}{!m.assessment && m.evidence && <a href={m.evidence} target="_blank" rel="noreferrer" className="underline underline-offset-4">{copy.evidence}</a>}</div></li>)}</ul>
        </div>}
      </> : <p className="mt-3 text-sm text-muted-foreground">{copy.waitingAutomatic}</p>}
    </section>
  </div>;
}

function Configuration({ workspace, copy, enabled }: { workspace: ProjectIntegrationWorkspace; copy: ProjectIntegrationCopy; enabled: boolean }) {
  const [state, action, pending] = useActionState(configurationAction, initial);
  const [initialToken] = useState(workspace.integration?.updatedAt ?? "");
  return <form action={action} className={panel}>
    <input type="hidden" name="operation" value="save" /><input type="hidden" name="projectId" value={workspace.project.id} />
    <input type="hidden" name="updatedAt" value={state.configurationUpdatedAt ?? initialToken} />
    <fieldset disabled={!enabled || pending} className="space-y-5 disabled:opacity-60">
      <label className="block text-sm font-medium">{copy.repository}<input name="repositoryFullName" className={field} defaultValue={workspace.project.repositoryFullName} required /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={workspace.integration?.enabled ?? false} />{copy.enabled}</label>
      <p className="text-sm text-muted-foreground">{copy.mediaRoot}</p>
      <Button type="submit">{pending ? copy.saving : copy.save}</Button>
    </fieldset>
    <Feedback state={state} copy={copy} />
  </form>;
}

function Operation({ projectId, operation, label, copy, enabled, jobId }: { projectId: string; operation: string; label: string; copy: ProjectIntegrationCopy; enabled: boolean; jobId?: string }) {
  const [state, action, pending] = useActionState(projectIntegrationAction, initial);
  return <form action={action} className="my-2">
    <input type="hidden" name="operation" value={operation} /><input type="hidden" name="projectId" value={projectId} />
    {jobId && <input type="hidden" name="jobId" value={jobId} />}
    <Button type="submit" variant="outline" disabled={!enabled || pending}>{pending ? copy.working : label}</Button>
    <Feedback state={state} copy={copy} />
  </form>;
}
