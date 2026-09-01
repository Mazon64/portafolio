"use client";

import { SaveIcon } from "lucide-react";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { DeleteForm } from "@/components/admin/delete-form";
import type { AdminExperience } from "@/data/admin/experience";
import type { AdminCopy } from "@/i18n/admin";
import {
  deleteExperienceAction,
  initialExperienceState,
  saveExperienceAction,
} from "./actions";

const fieldClass =
  "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

const emptyExperience: AdminExperience = {
  id: "",
  updatedAt: "",
  slug: "",
  company: "",
  startDate: "",
  endDate: "",
  showOnPortfolio: true,
  showOnCv: true,
  order: 0,
  es: { role: "", description: "" },
  en: { role: "", description: "" },
};

export function ExperienceForm({
  experience = emptyExperience,
  copy,
  onCreated,
}: {
  experience?: AdminExperience;
  copy: AdminCopy["experience"];
  onCreated?: () => void;
}) {
  const [state, action, pending] = useActionState(
    saveExperienceAction,
    initialExperienceState,
  );
  const router = useRouter();
  const message = state.status === "idle" ? null : copy.status[state.status];
  const finishCreate = useEffectEvent(() => {
    onCreated?.();
    router.refresh();
  });

  useEffect(() => {
    if (!experience.id && state.status === "success") finishCreate();
  }, [experience.id, state.status]);

  return (
    <div className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
      <form action={action} className="space-y-6">
        <input type="hidden" name="id" value={state.id ?? experience.id} />
        <input type="hidden" name="updatedAt" value={state.updatedAt ?? experience.updatedAt} />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <Field name="slug" label={copy.slug} value={experience.slug} required />
          <Field name="company" label={copy.company} value={experience.company} required />
          <Field name="startDate" label={copy.startDate} value={experience.startDate} type="date" required />
          <Field name="endDate" label={copy.endDate} value={experience.endDate} type="date" />
          <Field name="order" label={copy.order} value={String(experience.order)} type="number" required />
          <Check name="showOnPortfolio" label={copy.portfolio} checked={experience.showOnPortfolio} />
          <Check name="showOnCv" label={copy.cv} checked={experience.showOnCv} />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <Translation prefix="es" heading={copy.spanish} role={experience.es.role} description={experience.es.description} copy={copy} />
          <Translation prefix="en" heading={copy.english} role={experience.en.role} description={experience.en.description} copy={copy} />
        </div>
        {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
        <Button type="submit" disabled={pending}>
          <SaveIcon /> {pending ? copy.saving : copy.save}
        </Button>
      </form>
      {experience.id && (
        <DeleteForm
          action={deleteExperienceAction}
          id={state.id ?? experience.id}
          updatedAt={state.updatedAt ?? experience.updatedAt}
          label={copy.remove}
          confirmText={copy.confirmDelete}
          messages={copy.deleteStatus}
        />
      )}
    </div>
  );
}

export function NewExperienceForm({ copy }: { copy: AdminCopy["experience"] }) {
  const [resetKey, setResetKey] = useState(0);
  return <ExperienceForm key={resetKey} copy={copy} onCreated={() => setResetKey((key) => key + 1)} />;
}

function Field({ name, label, value, type = "text", required = false }: { name: string; label: string; value: string; type?: string; required?: boolean }) {
  return <label className="text-sm font-medium">{label}<input className={fieldClass} name={name} type={type} defaultValue={value} required={required} min={type === "number" ? 0 : undefined} /></label>;
}

function Check({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return <label className="flex items-center gap-3 self-end rounded-lg border border-border px-3 py-2 text-sm font-medium"><input name={name} type="checkbox" defaultChecked={checked} />{label}</label>;
}

function Translation({ prefix, heading, role, description, copy }: { prefix: "es" | "en"; heading: string; role: string; description: string; copy: AdminCopy["experience"] }) {
  return <fieldset className="space-y-4 rounded-2xl border border-border p-5"><legend className="px-2 font-mono text-xs uppercase tracking-widest">{heading}</legend><Field name={`${prefix}Role`} label={copy.role} value={role} required /><label className="block text-sm font-medium">{copy.roleDescription}<textarea className={fieldClass} name={`${prefix}Description`} defaultValue={description} rows={6} required /></label></fieldset>;
}
