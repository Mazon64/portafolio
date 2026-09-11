"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { ProjectIntegrationWorkspace } from "@/data/admin/project-integration";
import type { ProjectIntegrationCopy } from "@/i18n/project-integration";
import type { Locale } from "@/i18n/config";
import { milestoneProgress, type ProjectNarrative } from "@/lib/projects/schemas";
import { projectIntegrationAction, type ProjectIntegrationState } from "./integration-actions";

const initial: ProjectIntegrationState = { status: "idle" };
const field = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm";
const panel = "rounded-2xl border border-border bg-card p-6";
const locales = ["es", "en"] as const;

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
    <input type="hidden" name="operation" value="pilot" />
    <p className="mb-4 text-sm text-muted-foreground">{copy.pilotHint}</p>
    <Button type="submit" variant="outline" disabled={!enabled || pending}>{pending ? copy.working : copy.pilot}</Button>
    <Feedback state={state} copy={copy} />
  </form>;
}

export function ProjectIntegrationPanel({ workspace, copy, enabled }: { workspace: ProjectIntegrationWorkspace; copy: ProjectIntegrationCopy; enabled: boolean }) {
  const router = useRouter();
  const [publicationFeedback, publicationAction, publicationPending] = useActionState(projectIntegrationAction, initial);
  const draft = workspace.knowledge.find((item) => item.status === "DRAFT");
  const published = workspace.knowledge.find((item) => item.status === "PUBLISHED");
  return <div className="mt-8 space-y-6">
    {!enabled && <p className="text-sm text-muted-foreground">{copy.disabled}</p>}
    <Feedback state={publicationFeedback} copy={copy} />
    <Configuration key={workspace.project.id} workspace={workspace} copy={copy} enabled={enabled} />
    <section className={panel}>
      <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-2xl font-semibold">{copy.jobs}</h2><Button variant="ghost" onClick={() => router.refresh()}>{copy.refresh}</Button></div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Operation projectId={workspace.project.id} operation="sync" label={copy.sync} copy={copy} enabled={enabled && Boolean(workspace.integration?.enabled)} />
        <Operation projectId={workspace.project.id} operation="process" label={copy.process} copy={copy} enabled={enabled && Boolean(workspace.integration?.enabled)} />
      </div>
      <ul className="mt-5 divide-y divide-border">
        {workspace.jobs.map((job) => <li key={job.id} className="py-4 text-sm">
          <p>{copy.jobStatuses[job.status as keyof typeof copy.jobStatuses] ?? job.status} · {copy.attempts}: {job.attempts}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{job.createdAt}{job.requestedSha && ` · ${job.requestedSha.slice(0, 10)}`}</p>
          {job.error && <p className="mt-1 text-muted-foreground">{job.error} · {copy.nextAttempt}: {job.availableAt}</p>}
          {job.status === "FAILED" && <Operation projectId={workspace.project.id} operation="retry" jobId={job.id} label={copy.retry} copy={copy} enabled={enabled} />}
        </li>)}
      </ul>
      {!workspace.jobs.length && <p className="mt-5 text-muted-foreground">{copy.noJobs}</p>}
    </section>
    {draft ? <NarrativeEditor key={draft.id} draft={draft} projectId={workspace.project.id} copy={copy} enabled={enabled} action={publicationAction} pending={publicationPending} /> : <p className={panel}>{copy.noDraft}</p>}
    {published && <section className={panel}><h2 className="text-xl font-semibold">{copy.published}</h2><Sources sources={published.chunks} copy={copy} sha={published.commitSha} /></section>}
  </div>;
}

function Configuration({ workspace, copy, enabled }: { workspace: ProjectIntegrationWorkspace; copy: ProjectIntegrationCopy; enabled: boolean }) {
  const [state, action, pending] = useActionState(configurationAction, initial);
  const [initialToken] = useState(workspace.integration?.updatedAt ?? "");
  const [assets, setAssets] = useState(workspace.integration?.assets ?? []);
  const [milestones, setMilestones] = useState(workspace.integration?.milestones ?? []);
  const progress = milestoneProgress(milestones);
  return <form action={action} className={panel}>
    <input type="hidden" name="operation" value="save" /><input type="hidden" name="projectId" value={workspace.project.id} />
    <input type="hidden" name="updatedAt" value={state.configurationUpdatedAt ?? initialToken} />
    <input type="hidden" name="assets" value={JSON.stringify(assets)} /><input type="hidden" name="milestones" value={JSON.stringify(milestones)} />
    <fieldset disabled={!enabled || pending} className="space-y-6 disabled:opacity-60">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">{copy.repository}<input name="repositoryFullName" className={field} defaultValue={workspace.project.repositoryFullName} required /></label>
        <label className="text-sm font-medium">{copy.branch}<input name="branch" className={field} defaultValue={workspace.integration?.branch ?? "main"} required /></label>
      </div>
      <label className="block text-sm font-medium">{copy.paths}<textarea name="sourcePaths" className={field} rows={5} defaultValue={workspace.integration?.sourcePaths.join("\n") ?? "README.md"} required /></label>
      <p className="text-sm text-muted-foreground">{copy.sourcesHint}</p>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" defaultChecked={workspace.integration?.enabled ?? false} />{copy.enabled}</label>
      <section className="space-y-4 border-t border-border pt-5"><h2 className="text-xl font-semibold">{copy.assets}</h2><p className="text-sm text-muted-foreground">{copy.assetHint}</p>
        {assets.map((asset, index) => <div key={index} className="space-y-3 rounded-xl border border-border p-4">
          <label className="block text-sm">{copy.imageUrl}<input className={field} value={asset.url} onChange={(e) => setAssets(assets.map((a, i) => i === index ? { ...a, url: e.target.value } : a))} required /></label>
          <div className="grid gap-4 md:grid-cols-2">{locales.map((locale) => <div key={locale} className="space-y-3">
            <label className="block text-sm">{copy.alt} · {locale.toUpperCase()}<input className={field} value={asset.alt[locale]} onChange={(e) => setAssets(assets.map((a, i) => i === index ? { ...a, alt: { ...a.alt, [locale]: e.target.value } } : a))} required /></label>
            <label className="block text-sm">{copy.caption} · {locale.toUpperCase()}<textarea className={field} value={asset.caption[locale]} onChange={(e) => setAssets(assets.map((a, i) => i === index ? { ...a, caption: { ...a.caption, [locale]: e.target.value } } : a))} required /></label>
          </div>)}</div>
          <Button type="button" variant="ghost" onClick={() => setAssets(assets.filter((_, i) => i !== index))}>{copy.remove}</Button>
        </div>)}
        <Button type="button" variant="outline" disabled={assets.length >= 8} onClick={() => setAssets([...assets, { url: "", alt: { es: "", en: "" }, caption: { es: "", en: "" } }])}>{copy.addAsset}</Button>
      </section>
      <section className="space-y-4 border-t border-border pt-5"><h2 className="text-xl font-semibold">{copy.milestones}{progress !== null && ` · ${progress}%`}</h2><p className="text-sm text-muted-foreground">{copy.milestoneHint}</p>
        {milestones.map((milestone, index) => <div key={milestone.id} className="space-y-3 rounded-xl border border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">{locales.map((locale) => <label key={locale} className="block text-sm">{copy.milestoneTitle} · {locale.toUpperCase()}<input className={field} value={milestone.title[locale]} onChange={(e) => setMilestones(milestones.map((m, i) => i === index ? { ...m, title: { ...m.title, [locale]: e.target.value } } : m))} required /></label>)}</div>
          <label className="block text-sm">{copy.weight}<input className={field} type="number" min={1} max={100} value={milestone.weight} onChange={(e) => setMilestones(milestones.map((m, i) => i === index ? { ...m, weight: Number(e.target.value) } : m))} required /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={milestone.completed} onChange={(e) => setMilestones(milestones.map((m, i) => i === index ? { ...m, completed: e.target.checked } : m))} />{copy.completed}</label>
          <label className="block text-sm">{copy.evidence}<input type="url" className={field} value={milestone.evidence} onChange={(e) => setMilestones(milestones.map((m, i) => i === index ? { ...m, evidence: e.target.value } : m))} /></label>
          <Button type="button" variant="ghost" onClick={() => setMilestones(milestones.filter((_, i) => i !== index))}>{copy.remove}</Button>
        </div>)}
        <Button type="button" variant="outline" disabled={milestones.length >= 20} onClick={() => setMilestones([...milestones, { id: crypto.randomUUID(), title: { es: "", en: "" }, weight: 1, completed: false, evidence: "" }])}>{copy.addMilestone}</Button>
      </section>
      <Button type="submit">{pending ? copy.saving : copy.save}</Button>
    </fieldset>
    <Feedback state={state} copy={copy} />
  </form>;
}

function Operation({ projectId, operation, label, copy, enabled, jobId, knowledgeId }: { projectId: string; operation: string; label: string; copy: ProjectIntegrationCopy; enabled: boolean; jobId?: string; knowledgeId?: string }) {
  const [state, action, pending] = useActionState(projectIntegrationAction, initial);
  return <form action={action} className="my-2">
    <input type="hidden" name="operation" value={operation} /><input type="hidden" name="projectId" value={projectId} />
    {jobId && <input type="hidden" name="jobId" value={jobId} />}{knowledgeId && <input type="hidden" name="knowledgeId" value={knowledgeId} />}
    <Button type="submit" variant="outline" disabled={!enabled || pending}>{pending ? copy.working : label}</Button>
    <Feedback state={state} copy={copy} />
  </form>;
}

function NarrativeEditor({ draft, projectId, copy, enabled, action, pending }: { draft: ProjectIntegrationWorkspace["knowledge"][number]; projectId: string; copy: ProjectIntegrationCopy; enabled: boolean; action: (data: FormData) => void; pending: boolean }) {
  const [narrative, setNarrative] = useState<ProjectNarrative>(draft.narrative);
  return <section className={panel}>
    <h2 className="text-2xl font-semibold">{copy.draft}</h2>
    <Sources copy={copy} sources={draft.chunks} sha={draft.commitSha} />
    <form action={action} className="mt-6">
      <input type="hidden" name="operation" value="publish" /><input type="hidden" name="projectId" value={projectId} /><input type="hidden" name="knowledgeId" value={draft.id} />
      <input type="hidden" name="narrative" value={JSON.stringify(narrative)} />
      <fieldset disabled={!enabled || pending} className="space-y-5 disabled:opacity-60">
        <div className="grid gap-6 xl:grid-cols-2">{locales.map((locale) => <div key={locale} className="space-y-4"><h3 className="font-mono text-sm">{locale.toUpperCase()}</h3>
          {(["summary", "problem", "solution", "architecture", "decisions", "results"] as const).map((key) => <label key={key} className="block text-sm">{copy[key]}<textarea className={field} rows={5} value={narrative[locale][key]} maxLength={2000} required onChange={(e) => setNarrative({ ...narrative, [locale]: { ...narrative[locale], [key]: e.target.value } })} /></label>)}
        </div>)}</div>
        <p className="text-sm text-muted-foreground">{copy.publishHint}</p><Button type="submit">{pending ? copy.working : copy.publish}</Button>
      </fieldset>
    </form>
    <Operation projectId={projectId} operation="discard" knowledgeId={draft.id} label={copy.discard} copy={copy} enabled={enabled && !pending} />
  </section>;
}

function Sources({ sources, sha, copy }: { sources: Array<{ path: string; sourceUrl: string }>; sha: string; copy: ProjectIntegrationCopy }) {
  return <div className="mt-4 text-sm"><p className="font-mono text-xs text-muted-foreground">{copy.sourceLinks} · {sha.slice(0, 10)}</p><ul className="mt-3 flex flex-wrap gap-3">{sources.map((source) => <li key={source.path}><a href={source.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.path}</a></li>)}</ul></div>;
}
