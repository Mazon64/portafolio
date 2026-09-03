"use client";

import { SaveIcon } from "lucide-react";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DeleteForm } from "@/components/admin/delete-form";
import type { AdminEducation } from "@/data/admin/education";
import type { AdminCopy } from "@/i18n/admin";
import {
  type EducationActionState,
  deleteEducationAction,
  saveEducationAction,
} from "./actions";

const fieldClass =
  "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
const initialEducationState: EducationActionState = { status: "idle" };

const emptyEducation: AdminEducation = {
  id: "",
  updatedAt: "",
  slug: "",
  institution: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  showOnPortfolio: true,
  showOnCv: true,
  order: 0,
  esDegree: "",
  enDegree: "",
};

export function EducationForm({
  education = emptyEducation,
  copy,
  onCreated,
}: {
  education?: AdminEducation;
  copy: AdminCopy["education"];
  onCreated?: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveEducationAction,
    initialEducationState,
  );
  const router = useRouter();
  const [isCurrent, setIsCurrent] = useState(education.isCurrent);
  const message = state.status === "idle" ? null : copy.status[state.status];
  const finishCreate = useEffectEvent(() => {
    onCreated?.();
    router.refresh();
  });

  useEffect(() => {
    if (!education.id && state.status === "success") finishCreate();
  }, [education.id, state.status]);

  return (
    <div className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
      <form action={action} className="space-y-6">
        <input type="hidden" name="id" value={state.id ?? education.id} />
        <input type="hidden" name="updatedAt" value={state.updatedAt ?? education.updatedAt} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field name="slug" label={copy.slug} value={education.slug} required />
          <Field name="institution" label={copy.institution} value={education.institution} required />
          <Field name="startDate" label={copy.startDate} value={education.startDate} type="month" required />
          <Field name="endDate" label={copy.endDate} value={education.endDate} type="month" required={!isCurrent} disabled={isCurrent} />
          <Check name="isCurrent" label={copy.current} checked={isCurrent} onChange={setIsCurrent} />
          <Field name="order" label={copy.order} value={String(education.order)} type="number" required />
          <Check name="showOnPortfolio" label={copy.portfolio} checked={education.showOnPortfolio} />
          <Check name="showOnCv" label={copy.cv} checked={education.showOnCv} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field name="esDegree" label={`${copy.degree} · ${copy.spanish}`} value={education.esDegree} required />
          <Field name="enDegree" label={`${copy.degree} · ${copy.english}`} value={education.enDegree} required />
        </div>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        <Button type="submit" disabled={pending}><SaveIcon />{pending ? copy.saving : copy.save}</Button>
      </form>
      {education.id && (
        <DeleteForm action={deleteEducationAction} id={state.id ?? education.id} updatedAt={state.updatedAt ?? education.updatedAt} label={copy.remove} confirmText={copy.confirmDelete} messages={copy.deleteStatus} />
      )}
    </div>
  );
}

export function NewEducationForm({ copy }: { copy: AdminCopy["education"] }) {
  const [resetKey, setResetKey] = useState(0);
  return <EducationForm key={resetKey} copy={copy} onCreated={() => setResetKey((key) => key + 1)} />;
}

function Field({ name, label, value, type = "text", required = false, disabled = false }: { name: string; label: string; value: string; type?: string; required?: boolean; disabled?: boolean }) {
  return <label className="text-sm font-medium">{label}<input className={fieldClass} name={name} type={type} defaultValue={value} required={required} disabled={disabled} min={type === "number" ? 0 : undefined} /></label>;
}

function Check({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange?: (checked: boolean) => void }) {
  return <label className="flex items-center gap-3 self-end rounded-lg border border-border px-3 py-2 text-sm font-medium"><input name={name} type="checkbox" checked={onChange ? checked : undefined} defaultChecked={onChange ? undefined : checked} onChange={onChange ? (event) => onChange(event.target.checked) : undefined} />{label}</label>;
}
