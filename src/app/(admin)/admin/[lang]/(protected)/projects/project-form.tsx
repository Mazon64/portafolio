"use client";

import { SaveIcon } from "lucide-react";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DeleteForm } from "@/components/admin/delete-form";
import type { AdminProject } from "@/data/admin/projects";
import type { AdminCopy } from "@/i18n/admin";
import { deleteProjectAction, initialProjectState, saveProjectAction } from "./actions";

const fieldClass = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
const emptyProject: AdminProject = { id: "", updatedAt: "", slug: "", repositoryFullName: "", demoUrl: "", repositoryUrl: "", techStack: "", showOnPortfolio: true, showOnCv: false, order: 0, status: "PLANNED", progressPct: 0, es: { name: "", summary: "", detailedInfo: "" }, en: { name: "", summary: "", detailedInfo: "" } };

export function ProjectForm({ project = emptyProject, copy, onCreated }: { project?: AdminProject; copy: AdminCopy["projects"]; onCreated?: () => void }) {
  const [state, action, pending] = useActionState(saveProjectAction, initialProjectState);
  const router = useRouter();
  const finishCreate = useEffectEvent(() => {
    onCreated?.();
    router.refresh();
  });
  useEffect(() => {
    if (!project.id && state.status === "success") finishCreate();
  }, [project.id, state.status]);
  return <div className="rounded-3xl border border-border bg-card p-6"><form action={action} className="space-y-6"><input type="hidden" name="id" value={state.id ?? project.id} /><input type="hidden" name="updatedAt" value={state.updatedAt ?? project.updatedAt} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field name="slug" label={copy.slug} value={project.slug} /><Field name="repositoryFullName" label={copy.repositoryFullName} value={project.repositoryFullName} required={false} /><Field name="repositoryUrl" label={copy.repositoryUrl} value={project.repositoryUrl} type="url" required={false} /><Field name="demoUrl" label={copy.demoUrl} value={project.demoUrl} type="url" required={false} /><Field name="techStack" label={copy.techStack} value={project.techStack} required={false} /><Field name="order" label={copy.order} value={String(project.order)} type="number" /><label className="text-sm font-medium">{copy.statusLabel}<select name="status" defaultValue={project.status} className={fieldClass}>{Object.entries(copy.statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><Field name="progressPct" label={copy.progress} value={String(project.progressPct)} type="number" /><Check name="showOnPortfolio" label={copy.portfolio} checked={project.showOnPortfolio} /><Check name="showOnCv" label={copy.cv} checked={project.showOnCv} /></div><div className="grid gap-5 xl:grid-cols-2"><Translation prefix="es" value={project.es} copy={copy} /><Translation prefix="en" value={project.en} copy={copy} /></div>{state.status !== "idle" && <p className="text-sm text-muted-foreground">{copy.actionStatus[state.status]}</p>}<Button type="submit" disabled={pending}><SaveIcon />{pending ? copy.saving : copy.save}</Button></form>{project.id && <DeleteForm action={deleteProjectAction} id={state.id ?? project.id} updatedAt={state.updatedAt ?? project.updatedAt} label={copy.remove} confirmText={copy.confirmDelete} messages={copy.deleteStatus} />}</div>;
}

export function NewProjectForm({ copy }: { copy: AdminCopy["projects"] }) {
  const [resetKey, setResetKey] = useState(0);
  return <ProjectForm key={resetKey} copy={copy} onCreated={() => setResetKey((key) => key + 1)} />;
}

function Field({ name, label, value, type = "text", required = true }: { name: string; label: string; value: string; type?: string; required?: boolean }) { return <label className="text-sm font-medium">{label}<input name={name} className={fieldClass} type={type} defaultValue={value} required={required} min={type === "number" ? 0 : undefined} max={name === "progressPct" ? 100 : undefined} /></label>; }
function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) { return <label className="flex items-center gap-3 self-end rounded-lg border border-border px-3 py-2 text-sm font-medium"><input name={name} type="checkbox" defaultChecked={checked} />{label}</label>; }
function Translation({ prefix, value, copy }: { prefix: "es" | "en"; value: AdminProject["es"]; copy: AdminCopy["projects"] }) { return <fieldset className="space-y-4 rounded-2xl border border-border p-5"><legend className="px-2 font-mono text-xs uppercase">{prefix}</legend><Field name={`${prefix}Name`} label={copy.name} value={value.name} /><label className="block text-sm font-medium">{copy.summary}<textarea name={`${prefix}Summary`} className={fieldClass} defaultValue={value.summary} rows={4} required /></label><label className="block text-sm font-medium">{copy.detailedInfo}<textarea name={`${prefix}DetailedInfo`} className={fieldClass} defaultValue={value.detailedInfo} rows={10} required /></label></fieldset>; }
