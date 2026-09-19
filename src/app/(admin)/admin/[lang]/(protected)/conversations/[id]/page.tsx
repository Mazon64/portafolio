import Link from "next/link";
import { notFound } from "next/navigation";
import { PinIcon } from "lucide-react";
import { z } from "zod";
import { hasLocale } from "@/i18n/config";
import { chatCopy } from "@/i18n/chat";
import { isCmsWriteEnabled } from "@/config/env";
import { getAdminConversation } from "@/data/admin/conversations";
import { ConversationControl } from "../conversation-controls";

export default async function ConversationPage({ params, searchParams }: { params: Promise<{ lang: string; id: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ lang, id }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang) || !z.uuid().safeParse(id).success) notFound();
  const page = Number(query.page ?? 1);
  let conversation;
  try { conversation = await getAdminConversation(id, Number.isSafeInteger(page) ? page : 1); }
  catch (error) { if ((error as { code?: string }).code === "P2021") notFound(); throw error; }
  if (!conversation) notFound();
  const copy = chatCopy[lang]; const enabled = isCmsWriteEnabled();
  return <div>
    <Link href={`/admin/${lang}/conversations`} className="text-sm text-muted-foreground">← {copy.back}</Link>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-semibold">{copy.anonymous} · {id.slice(0, 8)}</h1><div className="flex flex-wrap gap-2">
      <ConversationControl conversationId={id} id={id} updatedAt={conversation.updatedAt} pinned={conversation.pinned} operation="pin-conversation" locale={lang} enabled={enabled} />
      <ConversationControl conversationId={id} id={id} updatedAt={conversation.updatedAt} pinned={conversation.pinned} operation="delete" locale={lang} enabled={enabled} />
    </div></div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">{copy.retention}</p>
    <div className="mt-8 space-y-8">{conversation.turns.map((turn) => <section key={turn.id} className="space-y-3">
      <div className="rounded-lg bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground">{copy.observed}: {copy.sections[turn.context.section]}{turn.context.projectSlug && ` · ${turn.context.projectSlug}`} · {turn.context.path}<br />{copy.resolved}: {turn.scope ? copy.scope[turn.scope.kind] : turn.status}{turn.scope?.projectSlugs.length ? ` · ${turn.scope.projectSlugs.join(", ")}` : ""}{turn.failureCode && ` · ${turn.failureCode}`}</div>
      {turn.messages.map((message) => <article key={message.id} className={`rounded-2xl border p-5 ${message.role === "USER" ? "border-border bg-card sm:ml-12" : "border-border bg-muted/30 sm:mr-12"}`}>
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">{message.role === "USER" ? copy.anonymous : copy.assistant}{message.pinned && <PinIcon aria-label={copy.pinned} className="size-4 text-amber-500" />}</div>
        <p className="whitespace-pre-wrap break-words text-sm leading-7">{message.content}</p>
        {message.sources.length > 0 && <ul className="mt-3 flex flex-wrap gap-3 text-xs">{message.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.title}</a></li>)}</ul>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><time className="text-xs text-muted-foreground">{new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(message.createdAt))} UTC</time><ConversationControl conversationId={id} id={message.id} updatedAt={message.updatedAt} pinned={message.pinned} operation="pin-message" locale={lang} enabled={enabled} /></div>
      </article>)}
    </section>)}</div>
    {!conversation.turns.length && <p className="mt-8 text-muted-foreground">{copy.empty}</p>}
    {conversation.pages > 1 && <nav className="mt-6 flex justify-between text-sm">{conversation.page > 1 ? <Link href={`?page=${conversation.page - 1}`}>{copy.newer}</Link> : <span />}<span>{copy.page} {conversation.page} / {conversation.pages}</span>{conversation.page < conversation.pages ? <Link href={`?page=${conversation.page + 1}`}>{copy.older}</Link> : <span />}</nav>}
  </div>;
}
