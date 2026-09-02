"use client";

import { EyeIcon, FileDownIcon, SaveIcon, SendIcon, SparklesIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { AdminDocumentWorkspace } from "@/data/admin/documents";
import type { AdminCopy } from "@/i18n/admin";
import type { Locale } from "@/i18n/config";
import {
  generateApplicationAction,
  generatePublicCvAction,
  initialDocumentState,
  publishPublicCvAction,
  saveAiContextAction,
} from "./actions";

const fieldClass =
  "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

export function DocumentWorkspace({
  locale,
  copy,
  workspace,
  sourceHashes,
}: {
  locale: Locale;
  copy: AdminCopy["documents"];
  workspace: AdminDocumentWorkspace;
  sourceHashes: Record<Locale, string>;
}) {
  const [contextState, contextAction, contextPending] = useActionState(
    saveAiContextAction,
    initialDocumentState,
  );
  const [publicState, publicAction, publicPending] = useActionState(
    generatePublicCvAction,
    initialDocumentState,
  );
  const [applicationState, applicationAction, applicationPending] = useActionState(
    generateApplicationAction,
    initialDocumentState,
  );

  return (
    <div className="mt-12 space-y-8">
      {!workspace.schemaReady && (
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm leading-6 text-muted-foreground">
          {copy.schemaPending}
        </p>
      )}

      <section className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.contextTitle}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          {copy.contextDescription}
        </p>
        <form action={contextAction} className="mt-6 space-y-5">
          <fieldset disabled={!workspace.schemaReady || contextPending} className="space-y-5 disabled:opacity-60">
            <label className="block text-sm font-medium">
              {copy.professionalContext}
              <textarea
                name="professionalContext"
                className={fieldClass}
                defaultValue={workspace.context?.professionalContext ?? ""}
                rows={8}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              {copy.personalContext}
              <textarea
                name="personalContext"
                className={fieldClass}
                defaultValue={workspace.context?.personalContext ?? ""}
                rows={5}
              />
            </label>
            <ActionStatus state={contextState.status} copy={copy} />
            <Button type="submit"><SaveIcon />{contextPending ? copy.saving : copy.saveContext}</Button>
          </fieldset>
        </form>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.publicTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.publicDescription}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            {(["es", "en"] as const).map((documentLocale) => (
              <form key={documentLocale} action={publicAction}>
                <input type="hidden" name="locale" value={documentLocale} />
                <Button type="submit" variant="outline" disabled={!workspace.schemaReady || publicPending}>
                  <SparklesIcon />
                  {copy.generatePublic} · {documentLocale.toUpperCase()}
                </Button>
              </form>
            ))}
          </div>
          <ActionStatus state={publicState.status} copy={copy} />
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.applicationTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.applicationDescription}</p>
          <form action={applicationAction} className="mt-6">
            <fieldset disabled={!workspace.schemaReady || applicationPending} className="grid gap-4 disabled:opacity-60 sm:grid-cols-2">
              <label className="text-sm font-medium">{copy.locale}<select name="locale" defaultValue={locale} className={fieldClass}><option value="es">ES</option><option value="en">EN</option></select></label>
              <label className="text-sm font-medium">{copy.company}<input name="company" className={fieldClass} required /></label>
              <label className="text-sm font-medium">{copy.role}<input name="role" className={fieldClass} required /></label>
              <label className="text-sm font-medium">{copy.sourceUrl}<input name="sourceUrl" type="url" className={fieldClass} /></label>
              <label className="block text-sm font-medium sm:col-span-2">{copy.jobDescription}<textarea name="jobDescription" className={fieldClass} rows={10} required /></label>
              <label className="block text-sm font-medium sm:col-span-2">{copy.notes}<textarea name="notes" className={fieldClass} rows={4} /></label>
              <div className="sm:col-span-2">
                <ActionStatus state={applicationState.status} copy={copy} />
                <Button type="submit"><SparklesIcon />{applicationPending ? copy.generating : copy.generateApplication}</Button>
              </div>
            </fieldset>
          </form>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
        <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.historyTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.historyDescription}</p>
        <div className="mt-6 divide-y divide-border border-y border-border">
          {workspace.artifacts.length === 0 ? (
            <p className="py-8 text-sm text-muted-foreground">{copy.emptyHistory}</p>
          ) : (
            workspace.artifacts.map((artifact) => {
              const artifactLocale = artifact.locale.toLowerCase() as Locale;
              const stale =
                artifact.kind === "PUBLIC_CV" &&
                artifact.sourceHash !== sourceHashes[artifactLocale];
              return (
                <article key={artifact.id} className="grid gap-4 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <p className="font-medium">{artifact.title}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {copy.kinds[artifact.kind]} · {artifact.locale} · v{artifact.version} · {copy.statuses[artifact.status]}
                    </p>
                    {artifact.application && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {artifact.application.role} · {artifact.application.company}
                      </p>
                    )}
                    {stale && <p className="mt-2 text-sm font-medium">{copy.stale}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" render={<Link href={`/admin/${artifactLocale}/documents/${artifact.id}`} />}><EyeIcon />{copy.review}</Button>
                    {artifact.kind !== "PUBLIC_CV" && (
                      <>
                        <Button variant="outline" size="sm" render={<a href={`/admin/${artifactLocale}/documents/${artifact.id}/download?format=pdf`} />}><FileDownIcon />PDF</Button>
                        <Button variant="outline" size="sm" render={<a href={`/admin/${artifactLocale}/documents/${artifact.id}/download?format=docx`} />}><FileDownIcon />DOCX</Button>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

export function PublishForm({ id, copy, enabled }: { id: string; copy: AdminCopy["documents"]; enabled: boolean }) {
  const [state, action, pending] = useActionState(publishPublicCvAction, initialDocumentState);
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" disabled={!enabled || pending}><SendIcon />{copy.publish}</Button>
      <ActionStatus state={state.status} copy={copy} compact />
    </form>
  );
}

function ActionStatus({ state, copy, compact = false }: { state: keyof AdminCopy["documents"]["actionStatus"]; copy: AdminCopy["documents"]; compact?: boolean }) {
  if (state === "idle") return null;
  return <p role="status" className={`${compact ? "text-xs" : "my-4 text-sm"} text-muted-foreground`}>{copy.actionStatus[state]}</p>;
}
