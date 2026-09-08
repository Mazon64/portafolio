"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  LoaderCircleIcon,
  SaveIcon,
  SendIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useEffectEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import type { AdminDocumentWorkspace } from "@/data/admin/documents";
import type { AdminCopy } from "@/i18n/admin";
import type { Locale } from "@/i18n/config";
import type {
  ApplicationDocumentsDraft,
  PublicCvDraft,
} from "@/lib/documents/generate";
import {
  type DocumentActionState,
  generateApplicationAction,
  generatePublicCvAction,
  publishPublicCvAction,
  saveAiContextAction,
  saveApplicationDocumentsAction,
  savePublicCvDraftAction,
} from "./actions";

const fieldClass =
  "mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
const initialDocumentState: DocumentActionState = { status: "idle" };

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
          <fieldset
            disabled={!workspace.schemaReady || contextPending}
            className="space-y-5 disabled:opacity-60"
          >
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
            <Button type="submit">
              <SaveIcon />
              {contextPending ? copy.saving : copy.saveContext}
            </Button>
          </fieldset>
        </form>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.6fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.publicTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.publicDescription}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {(["es", "en"] as const).map((documentLocale) => (
                <form key={documentLocale} action={publicAction}>
                  <input type="hidden" name="locale" value={documentLocale} />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={!workspace.schemaReady || publicPending}
                  >
                    {publicPending ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <SparklesIcon />
                    )}
                    {publicPending ? copy.generating : copy.generatePublic} ·{" "}
                    {documentLocale.toUpperCase()}
                  </Button>
                </form>
              ))}
            </div>
            {publicPending && <GenerationStatus copy={copy} />}
            {publicState.status !== "generated" && (
              <ActionStatus state={publicState.status} copy={copy} />
            )}
            {publicState.publicDraft && (
              <PublicDraftEditor
                key={publicState.publicDraft.draftId}
                draft={publicState.publicDraft}
                locale={locale}
                copy={copy}
              />
            )}
          </div>

          <div className="rounded-3xl border border-border bg-card p-6 text-card-foreground">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">
              {copy.applicationTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.applicationDescription}
            </p>
            <form action={applicationAction} className="mt-6">
              <fieldset
                disabled={!workspace.schemaReady || applicationPending}
                className="grid gap-4 disabled:opacity-60 sm:grid-cols-2"
              >
                <label className="text-sm font-medium">
                  {copy.locale}
                  <select name="locale" defaultValue={locale} className={fieldClass}>
                    <option value="es">ES</option>
                    <option value="en">EN</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  {copy.company}
                  <input name="company" className={fieldClass} required />
                </label>
                <label className="text-sm font-medium">
                  {copy.role}
                  <input name="role" className={fieldClass} required />
                </label>
                <label className="text-sm font-medium">
                  {copy.sourceUrl}
                  <input name="sourceUrl" type="url" className={fieldClass} />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  {copy.jobDescription}
                  <textarea name="jobDescription" className={fieldClass} rows={10} required />
                </label>
                <label className="block text-sm font-medium sm:col-span-2">
                  {copy.notes}
                  <textarea name="notes" className={fieldClass} rows={4} />
                </label>
                <div className="sm:col-span-2">
                  {applicationPending && <GenerationStatus copy={copy} />}
                  {applicationState.status !== "generated" && (
                    <ActionStatus state={applicationState.status} copy={copy} />
                  )}
                  <Button type="submit">
                    {applicationPending ? (
                      <LoaderCircleIcon className="animate-spin" />
                    ) : (
                      <SparklesIcon />
                    )}
                    {applicationPending ? copy.generating : copy.generateApplication}
                  </Button>
                </div>
              </fieldset>
            </form>
            {applicationState.applicationDraft && (
              <ApplicationDraftEditor
                key={applicationState.applicationDraft.draftId}
                draft={applicationState.applicationDraft}
                locale={locale}
                copy={copy}
              />
            )}
          </div>
        </div>

        <HistoryPanel
          locale={locale}
          copy={copy}
          workspace={workspace}
          sourceHashes={sourceHashes}
        />
      </section>
    </div>
  );
}

function PublicDraftEditor({
  draft,
  locale,
  copy,
}: {
  draft: PublicCvDraft;
  locale: Locale;
  copy: AdminCopy["documents"];
}) {
  const [state, action, pending] = useActionState(
    savePublicCvDraftAction,
    initialDocumentState,
  );
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const finishSave = useEffectEvent(() => {
    router.replace(`/admin/${locale}/documents`, { scroll: false });
    router.refresh();
  });

  useEffect(() => {
    if (state.status === "success") finishSave();
  }, [state.status]);

  if (!visible || state.status === "success") return null;
  return (
    <form action={action} className="mt-6 border-t border-border pt-6">
      <input type="hidden" name="draftId" value={draft.draftId} />
      <input type="hidden" name="locale" value={draft.locale} />
      <input type="hidden" name="sourceHash" value={draft.sourceHash} />
      <input type="hidden" name="model" value={draft.model} />
      <input type="hidden" name="proof" value={draft.proof} />
      <DraftHeader copy={copy} locale={draft.locale} />
      <fieldset disabled={pending} className="mt-5 space-y-5 disabled:opacity-60">
        <label className="block text-sm font-medium">
          {copy.summary}
          <textarea
            name="summary"
            className={fieldClass}
            defaultValue={draft.content.summary}
            rows={6}
            required
          />
        </label>
        {draft.content.experience.map((item) => (
          <label key={item.slug} className="block text-sm font-medium">
            {copy.experience} · {labelFor(draft.experienceLabels, item.slug)}
            <input type="hidden" name="experienceSlug" value={item.slug} />
            <textarea
              name="experienceDescription"
              className={fieldClass}
              defaultValue={item.description}
              rows={5}
              required
            />
          </label>
        ))}
        {draft.content.projects.map((item) => (
          <label key={item.slug} className="block text-sm font-medium">
            {copy.projects} · {labelFor(draft.projectLabels, item.slug)}
            <input type="hidden" name="projectSlug" value={item.slug} />
            <textarea
              name="projectSummary"
              className={fieldClass}
              defaultValue={item.summary}
              rows={4}
              required
            />
          </label>
        ))}
        <ActionStatus state={state.status} copy={copy} />
        <DraftActions pending={pending} copy={copy} onDiscard={() => setVisible(false)} />
      </fieldset>
    </form>
  );
}

function ApplicationDraftEditor({
  draft,
  locale,
  copy,
}: {
  draft: ApplicationDocumentsDraft;
  locale: Locale;
  copy: AdminCopy["documents"];
}) {
  const [state, action, pending] = useActionState(
    saveApplicationDocumentsAction,
    initialDocumentState,
  );
  const [visible, setVisible] = useState(true);
  const router = useRouter();
  const finishSave = useEffectEvent(() => {
    router.replace(`/admin/${locale}/documents`, { scroll: false });
    router.refresh();
  });

  useEffect(() => {
    if (state.status === "success") finishSave();
  }, [state.status]);

  if (!visible || state.status === "success") return null;
  return (
    <form action={action} className="mt-8 border-t border-border pt-6">
      <input type="hidden" name="draftId" value={draft.draftId} />
      <input type="hidden" name="locale" value={draft.application.locale} />
      <input type="hidden" name="company" value={draft.application.company} />
      <input type="hidden" name="role" value={draft.application.role} />
      <input type="hidden" name="sourceUrl" value={draft.application.sourceUrl ?? ""} />
      <input type="hidden" name="jobDescription" value={draft.application.jobDescription} />
      <input type="hidden" name="notes" value={draft.application.notes ?? ""} />
      <input type="hidden" name="sourceHash" value={draft.sourceHash} />
      <input type="hidden" name="model" value={draft.model} />
      <input type="hidden" name="proof" value={draft.proof} />
      <DraftHeader
        copy={copy}
        locale={draft.application.locale}
        detail={`${draft.application.role} · ${draft.application.company}`}
      />
      <fieldset disabled={pending} className="mt-6 space-y-7 disabled:opacity-60">
        <section className="space-y-5">
          <h4 className="font-mono text-xs tracking-[0.16em] text-muted-foreground">
            {copy.atsCv.toUpperCase()}
          </h4>
          <label className="block text-sm font-medium">
            {copy.headline}
            <input
              name="headline"
              className={fieldClass}
              defaultValue={draft.ats.headline}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            {copy.summary}
            <textarea
              name="summary"
              className={fieldClass}
              defaultValue={draft.ats.summary}
              rows={6}
              required
            />
          </label>
          <fieldset>
            <legend className="text-sm font-medium">{copy.skills}</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {draft.skillLabels.map((skill) => (
                <label
                  key={skill.slug}
                  className="flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="skill"
                    value={skill.slug}
                    defaultChecked={draft.ats.skills.includes(skill.slug)}
                  />
                  {skill.label}
                </label>
              ))}
            </div>
          </fieldset>
          {draft.ats.experience.map((item) => (
            <label key={item.slug} className="block text-sm font-medium">
              {copy.experience} · {labelFor(draft.experienceLabels, item.slug)}
              <span className="ml-2 font-normal text-muted-foreground">{copy.bulletsHint}</span>
              <input type="hidden" name="experienceSlug" value={item.slug} />
              <textarea
                name="experienceBullets"
                className={fieldClass}
                defaultValue={item.bullets.join("\n")}
                rows={Math.max(4, item.bullets.length + 1)}
                required
              />
            </label>
          ))}
          {draft.ats.projects.map((item) => (
            <label key={item.slug} className="block text-sm font-medium">
              {copy.projects} · {labelFor(draft.projectLabels, item.slug)}
              <span className="ml-2 font-normal text-muted-foreground">{copy.bulletsHint}</span>
              <input type="hidden" name="projectSlug" value={item.slug} />
              <textarea
                name="projectBullets"
                className={fieldClass}
                defaultValue={item.bullets.join("\n")}
                rows={Math.max(4, item.bullets.length + 1)}
                required
              />
            </label>
          ))}
        </section>

        <section className="space-y-5 border-t border-border pt-6">
          <h4 className="font-mono text-xs tracking-[0.16em] text-muted-foreground">
            {copy.coverLetter.toUpperCase()}
          </h4>
          <label className="block text-sm font-medium">
            {copy.subject}
            <input name="subject" className={fieldClass} defaultValue={draft.cover.subject} required />
          </label>
          <label className="block text-sm font-medium">
            {copy.salutation}
            <input
              name="salutation"
              className={fieldClass}
              defaultValue={draft.cover.salutation}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            {copy.paragraphs}
            <textarea
              name="paragraphs"
              className={fieldClass}
              defaultValue={draft.cover.paragraphs.join("\n\n")}
              rows={12}
              required
            />
          </label>
          <label className="block text-sm font-medium">
            {copy.closing}
            <input name="closing" className={fieldClass} defaultValue={draft.cover.closing} required />
          </label>
        </section>
        <ActionStatus state={state.status} copy={copy} />
        <DraftActions pending={pending} copy={copy} onDiscard={() => setVisible(false)} />
      </fieldset>
    </form>
  );
}

function DraftHeader({
  copy,
  locale,
  detail,
}: {
  copy: AdminCopy["documents"];
  locale: Locale;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold">{copy.unsavedDraft}</h3>
        <span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs">
          {locale.toUpperCase()}
        </span>
        {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy.unsavedDescription}</p>
    </div>
  );
}

function DraftActions({
  pending,
  copy,
  onDiscard,
}: {
  pending: boolean;
  copy: AdminCopy["documents"];
  onDiscard: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Button type="submit" disabled={pending}>
        {pending ? <LoaderCircleIcon className="animate-spin" /> : <SaveIcon />}
        {pending ? copy.saving : copy.saveDraft}
      </Button>
      <Button type="button" variant="ghost" disabled={pending} onClick={onDiscard}>
        <XIcon />
        {copy.discardDraft}
      </Button>
    </div>
  );
}

function HistoryPanel({
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
  const { page, totalPages, totalItems } = workspace.history;
  const pageHref = (target: number) =>
    target === 1 ? `/admin/${locale}/documents` : `/admin/${locale}/documents?page=${target}`;

  return (
    <aside className="rounded-3xl border border-border bg-card p-6 text-card-foreground xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-[-0.03em]">{copy.historyTitle}</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {copy.historyDescription}
          </p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 font-mono text-xs">
          {totalItems}
        </span>
      </div>
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
              <article key={artifact.id} className="py-5">
                <p className="font-medium">{artifact.title}</p>
                <p className="mt-1 font-mono text-xs leading-5 text-muted-foreground">
                  {copy.kinds[artifact.kind]} · {artifact.locale} · v{artifact.version} ·{" "}
                  {copy.statuses[artifact.status]}
                </p>
                {artifact.application && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {artifact.application.role} · {artifact.application.company}
                  </p>
                )}
                {stale && <p className="mt-2 text-sm font-medium">{copy.stale}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    render={
                      <Link href={`/admin/${artifactLocale}/documents/${artifact.id}`} />
                    }
                  >
                    <EyeIcon />
                    {copy.review}
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </div>
      {totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-between gap-3" aria-label={copy.historyTitle}>
          {page > 1 ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={pageHref(page - 1)} scroll={false} />}
            >
              <ChevronLeftIcon />
              {copy.previousPage}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              <ChevronLeftIcon />
              {copy.previousPage}
            </Button>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {copy.page} {page} {copy.of} {totalPages}
          </span>
          {page < totalPages ? (
            <Button
              variant="outline"
              size="sm"
              render={<Link href={pageHref(page + 1)} scroll={false} />}
            >
              {copy.nextPage}
              <ChevronRightIcon />
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {copy.nextPage}
              <ChevronRightIcon />
            </Button>
          )}
        </nav>
      )}
    </aside>
  );
}

export function PublishForm({
  id,
  copy,
  enabled,
}: {
  id: string;
  copy: AdminCopy["documents"];
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    publishPublicCvAction,
    initialDocumentState,
  );
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <Button type="submit" size="sm" disabled={!enabled || pending}>
        <SendIcon />
        {copy.publish}
      </Button>
      <ActionStatus state={state.status} copy={copy} compact />
    </form>
  );
}

function GenerationStatus({ copy }: { copy: AdminCopy["documents"] }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="my-5 flex gap-3 rounded-2xl border border-border bg-muted/30 p-4"
    >
      <LoaderCircleIcon className="mt-0.5 size-5 shrink-0 animate-spin" />
      <div>
        <p className="text-sm font-medium">{copy.generating}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {copy.generationProgress}
        </p>
      </div>
    </div>
  );
}

function ActionStatus({
  state,
  copy,
  compact = false,
}: {
  state: keyof AdminCopy["documents"]["actionStatus"];
  copy: AdminCopy["documents"];
  compact?: boolean;
}) {
  if (state === "idle" || state === "generated") return null;
  return (
    <p
      role="status"
      className={`${compact ? "text-xs" : "my-4 text-sm"} text-muted-foreground`}
    >
      {copy.actionStatus[state]}
    </p>
  );
}

function labelFor(labels: Array<{ slug: string; label: string }>, slug: string) {
  return labels.find((item) => item.slug === slug)?.label ?? slug;
}
