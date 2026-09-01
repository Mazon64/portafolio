"use client";

import { SaveIcon } from "lucide-react";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DeleteForm } from "@/components/admin/delete-form";
import type { AdminSkill, AdminSkillCategory } from "@/data/admin/skills";
import type { AdminCopy } from "@/i18n/admin";
import {
  deleteCategoryAction,
  deleteSkillAction,
  initialSkillState,
  saveCategoryAction,
  saveSkillAction,
} from "./actions";

const fieldClass = "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

export function CategoryForm({ category, copy, onCreated }: { category?: AdminSkillCategory; copy: AdminCopy["skills"]; onCreated?: () => void }) {
  const [state, action, pending] = useActionState(saveCategoryAction, initialSkillState);
  const router = useRouter();
  const isExisting = Boolean(category);
  const value = category ?? { id: "", updatedAt: "", slug: "", presentation: "ICON_TILES" as const, order: 0, showOnPortfolio: true, showOnCv: true, esTitle: "", esDescription: "", enTitle: "", enDescription: "", skills: [] };
  const finishCreate = useEffectEvent(() => {
    onCreated?.();
    router.refresh();
  });
  useEffect(() => {
    if (!isExisting && state.status === "success") finishCreate();
    else if (isExisting && (state.status === "success" || state.status === "cache-error")) router.refresh();
  }, [isExisting, router, state.status]);
  const updatedAt = state.updatedAt && state.updatedAt > value.updatedAt ? state.updatedAt : value.updatedAt;
  return <div className="rounded-3xl border border-border bg-card p-6"><form action={action} className="space-y-5"><input type="hidden" name="id" value={state.id ?? value.id} /><input type="hidden" name="updatedAt" value={updatedAt} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field name="slug" label={copy.slug} value={value.slug} /><label className="text-sm font-medium">{copy.presentation}<select name="presentation" defaultValue={value.presentation} className={fieldClass}><option value="ICON_TILES">{copy.iconTiles}</option><option value="BADGES">{copy.badges}</option></select></label><Field name="order" label={copy.order} value={String(value.order)} type="number" /><Check name="showOnPortfolio" label={copy.portfolio} checked={value.showOnPortfolio} /><Check name="showOnCv" label={copy.cv} checked={value.showOnCv} /></div><div className="grid gap-4 md:grid-cols-2"><Translation prefix="es" title={value.esTitle} description={value.esDescription} copy={copy} /><Translation prefix="en" title={value.enTitle} description={value.enDescription} copy={copy} /></div>{state.status !== "idle" && <p className="text-sm text-muted-foreground">{copy.status[state.status]}</p>}<Button type="submit" disabled={pending}><SaveIcon />{pending ? copy.saving : copy.save}</Button></form>{value.id && <DeleteForm action={deleteCategoryAction} id={state.id ?? value.id} updatedAt={updatedAt} label={copy.removeCategory} confirmText={copy.confirmCategory} messages={copy.deleteStatus} />}</div>;
}

export function SkillForm({ skill, categoryId, copy, onCreated }: { skill?: AdminSkill; categoryId: string; copy: AdminCopy["skills"]; onCreated?: () => void }) {
  const [state, action, pending] = useActionState(saveSkillAction, initialSkillState);
  const router = useRouter();
  const isExisting = Boolean(skill);
  const value = skill ?? { id: "", updatedAt: "", categoryId, slug: "", iconKey: "", order: 0, showOnPortfolio: true, showOnCv: true, esName: "", enName: "" };
  const finishCreate = useEffectEvent(() => {
    onCreated?.();
    router.refresh();
  });
  useEffect(() => {
    if (!isExisting && state.status === "success") finishCreate();
    else if (isExisting && (state.status === "success" || state.status === "cache-error")) router.refresh();
  }, [isExisting, router, state.status]);
  return <div className="rounded-2xl border border-border bg-background p-5"><form action={action} className="space-y-4"><input type="hidden" name="id" value={state.id ?? value.id} /><input type="hidden" name="updatedAt" value={state.updatedAt ?? value.updatedAt} /><input type="hidden" name="categoryId" value={categoryId} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Field name="slug" label={copy.slug} value={value.slug} /><Field name="iconKey" label={copy.iconKey} value={value.iconKey} /><Field name="order" label={copy.order} value={String(value.order)} type="number" /><Check name="showOnPortfolio" label={copy.portfolio} checked={value.showOnPortfolio} /><Check name="showOnCv" label={copy.cv} checked={value.showOnCv} /><Field name="esName" label={`${copy.name} · ES`} value={value.esName} /><Field name="enName" label={`${copy.name} · EN`} value={value.enName} /></div>{state.status !== "idle" && <p className="text-sm text-muted-foreground">{copy.status[state.status]}</p>}<Button type="submit" disabled={pending}><SaveIcon />{pending ? copy.saving : copy.save}</Button></form>{value.id && <DeleteForm action={deleteSkillAction} id={state.id ?? value.id} updatedAt={state.updatedAt ?? value.updatedAt} label={copy.removeSkill} confirmText={copy.confirmSkill} messages={copy.deleteStatus} />}</div>;
}

export function NewCategoryForm({ copy }: { copy: AdminCopy["skills"] }) {
  const [resetKey, setResetKey] = useState(0);
  return <CategoryForm key={resetKey} copy={copy} onCreated={() => setResetKey((key) => key + 1)} />;
}

export function NewSkillForm({ categoryId, copy }: { categoryId: string; copy: AdminCopy["skills"] }) {
  const [resetKey, setResetKey] = useState(0);
  return <SkillForm key={resetKey} categoryId={categoryId} copy={copy} onCreated={() => setResetKey((key) => key + 1)} />;
}

function Field({ name, label, value, type = "text" }: { name: string; label: string; value: string; type?: string }) { return <label className="text-sm font-medium">{label}<input className={fieldClass} name={name} type={type} defaultValue={value} required min={type === "number" ? 0 : undefined} /></label>; }
function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) { return <label className="flex items-center gap-3 self-end rounded-lg border border-border px-3 py-2 text-sm font-medium"><input name={name} type="checkbox" defaultChecked={checked} />{label}</label>; }
function Translation({ prefix, title, description, copy }: { prefix: "es" | "en"; title: string; description: string; copy: AdminCopy["skills"] }) { return <fieldset className="space-y-4 rounded-xl border border-border p-4"><legend className="px-2 font-mono text-xs uppercase">{prefix}</legend><Field name={`${prefix}Title`} label={copy.titleLabel} value={title} /><label className="block text-sm font-medium">{copy.descriptionLabel}<textarea className={fieldClass} name={`${prefix}Description`} defaultValue={description} rows={3} required /></label></fieldset>; }
