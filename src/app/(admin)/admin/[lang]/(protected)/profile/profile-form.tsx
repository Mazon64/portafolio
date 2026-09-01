"use client";

import { SaveIcon } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { AdminProfile } from "@/data/admin/profile";
import type { AdminCopy } from "@/i18n/admin";
import type { Locale } from "@/i18n/config";
import { updateProfileAction } from "./actions";
import {
  initialProfileFormState,
  type ProfileField,
  type ProfileFormState,
} from "./profile-form-state";

type ProfileCopy = AdminCopy["profile"];

const inputClassName =
  "mt-2 w-full rounded-xl border border-input bg-background px-4 py-3 text-base shadow-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/20 aria-invalid:border-destructive aria-invalid:ring-destructive/10";

function FieldError({
  field,
  state,
}: {
  field: ProfileField;
  state: ProfileFormState;
}) {
  const errors = state.errors?.[field];
  if (!errors?.length) return null;

  return (
    <p id={`${field}-error`} className="mt-2 text-sm text-destructive">
      {errors[0]}
    </p>
  );
}

export function ProfileForm({
  profile,
  locale,
  copy,
}: {
  profile: AdminProfile;
  locale: Locale;
  copy: ProfileCopy;
}) {
  const [state, action, pending] = useActionState(
    updateProfileAction,
    initialProfileFormState,
  );
  const statusMessage = {
    idle: null,
    success: copy.success,
    invalid: copy.invalid,
    disabled: copy.disabled,
    conflict: copy.conflict,
    "cache-error": copy.cacheError,
    error: copy.failed,
  }[state.status];

  return (
    <form action={action} className="mt-12 space-y-8">
      <input type="hidden" name="uiLocale" value={locale} />
      <input
        type="hidden"
        name="updatedAt"
        value={state.updatedAt ?? profile.updatedAt}
      />

      <fieldset className="rounded-3xl border border-border bg-card p-6 text-card-foreground sm:p-8">
        <legend className="px-2 font-mono text-xs tracking-[0.16em] uppercase">{copy.shared}</legend>
        <div className="grid gap-6 md:grid-cols-2">
          <label className="block text-sm font-medium" htmlFor="fullName">
            {copy.fullName}
            <input
              id="fullName"
              name="fullName"
              defaultValue={profile.fullName}
              required
              maxLength={160}
              aria-invalid={Boolean(state.errors?.fullName)}
              aria-describedby={state.errors?.fullName ? "fullName-error" : undefined}
              className={inputClassName}
            />
            <FieldError field="fullName" state={state} />
          </label>
          <label className="block text-sm font-medium" htmlFor="email">
            {copy.email}
            <input
              id="email"
              name="email"
              type="email"
              defaultValue={profile.email}
              maxLength={320}
              aria-invalid={Boolean(state.errors?.email)}
              aria-describedby={state.errors?.email ? "email-error" : undefined}
              className={inputClassName}
            />
            <FieldError field="email" state={state} />
          </label>
        </div>
      </fieldset>

      <div className="grid gap-8 xl:grid-cols-2">
        <LanguageFields
          heading={copy.spanish}
          titleLabel={copy.titleEs}
          bioLabel={copy.bioEs}
          contactLabel={copy.contactEs}
          prefix="es"
          values={profile.es}
          state={state}
        />
        <LanguageFields
          heading={copy.english}
          titleLabel={copy.titleEn}
          bioLabel={copy.bioEn}
          contactLabel={copy.contactEn}
          prefix="en"
          values={profile.en}
          state={state}
        />
      </div>

      {statusMessage && (
        <p
          role={
            state.status === "success" || state.status === "cache-error"
              ? "status"
              : "alert"
          }
          className={
            state.status === "success"
              ? "rounded-xl border border-emerald-700/20 bg-emerald-700/10 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-200"
              : state.status === "cache-error"
                ? "rounded-xl border border-amber-700/20 bg-amber-700/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
                : "rounded-xl border border-red-700/20 bg-red-700/10 px-4 py-3 text-sm text-red-900 dark:text-red-200"
          }
        >
          {statusMessage}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        <SaveIcon />
        {pending ? copy.saving : copy.save}
      </Button>
    </form>
  );
}

function LanguageFields({
  heading,
  titleLabel,
  bioLabel,
  contactLabel,
  prefix,
  values,
  state,
}: {
  heading: string;
  titleLabel: string;
  bioLabel: string;
  contactLabel: string;
  prefix: "es" | "en";
  values: AdminProfile["es"];
  state: ProfileFormState;
}) {
  const titleField = `${prefix}Title` as ProfileField;
  const bioField = `${prefix}LongBio` as ProfileField;
  const contactField = `${prefix}ContactText` as ProfileField;

  return (
    <fieldset className="rounded-3xl border border-border bg-card p-6 text-card-foreground sm:p-8">
      <legend className="px-2 font-mono text-xs tracking-[0.16em] uppercase">{heading}</legend>
      <div className="space-y-6">
        <label className="block text-sm font-medium" htmlFor={titleField}>
          {titleLabel}
          <input
            id={titleField}
            name={titleField}
            defaultValue={values.title}
            required
            maxLength={200}
            aria-invalid={Boolean(state.errors?.[titleField])}
            aria-describedby={state.errors?.[titleField] ? `${titleField}-error` : undefined}
            className={inputClassName}
          />
          <FieldError field={titleField} state={state} />
        </label>
        <label className="block text-sm font-medium" htmlFor={bioField}>
          {bioLabel}
          <textarea
            id={bioField}
            name={bioField}
            defaultValue={values.longBio}
            required
            maxLength={8_000}
            rows={12}
            aria-invalid={Boolean(state.errors?.[bioField])}
            aria-describedby={state.errors?.[bioField] ? `${bioField}-error` : undefined}
            className={inputClassName}
          />
          <FieldError field={bioField} state={state} />
        </label>
        <label className="block text-sm font-medium" htmlFor={contactField}>
          {contactLabel}
          <textarea
            id={contactField}
            name={contactField}
            defaultValue={values.contactText}
            required
            maxLength={1_500}
            rows={5}
            aria-invalid={Boolean(state.errors?.[contactField])}
            aria-describedby={state.errors?.[contactField] ? `${contactField}-error` : undefined}
            className={inputClassName}
          />
          <FieldError field={contactField} state={state} />
        </label>
      </div>
    </fieldset>
  );
}
