import Link from "next/link";
import { PinIcon, MessageSquareIcon } from "lucide-react";
import { hasLocale } from "@/i18n/config";
import { chatCopy } from "@/i18n/chat";
import { getAdminConversations } from "@/data/admin/conversations";
import { Button } from "@/components/ui/button";

export default async function ConversationsPage({ params, searchParams }: { params: Promise<{ lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ lang }, query] = await Promise.all([params, searchParams]);
  if (!hasLocale(lang)) return null;
  const copy = chatCopy[lang];
  const q = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const pinned = query.pinned === "true";
  const requested = typeof query.page === "string" ? Number(query.page) : 1;
  let data: Awaited<ReturnType<typeof getAdminConversations>> = { page: 1, pages: 1, total: 0, conversations: [] };
  let schemaPending = false;
  try { data = await getAdminConversations(Number.isSafeInteger(requested) ? requested : 1, q, pinned); }
  catch (error) { if ((error as { code?: string }).code === "P2021") schemaPending = true; else throw error; }
  const href = (page: number) => `/admin/${lang}/conversations?${new URLSearchParams({ q, pinned: String(pinned), page: String(page) })}`;
  return <div>
    <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">{copy.adminTitle}</h1>
    <p className="mt-5 max-w-3xl leading-7 text-muted-foreground">{copy.adminDescription}</p>
    {schemaPending && <p role="status" className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">{copy.schemaPending}</p>}
    <form method="get" className="my-8 flex flex-wrap items-end gap-3">
      <label className="min-w-56 flex-1 text-sm">{copy.search}<input name="q" defaultValue={q} maxLength={100} className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2" /></label>
      <label className="flex items-center gap-2 py-2 text-sm"><input type="checkbox" name="pinned" value="true" defaultChecked={pinned} />{copy.pinnedOnly}</label>
      <Button type="submit">{copy.filter}</Button>
    </form>
    <div className="space-y-3">{data.conversations.map((conversation) => <Link key={conversation.id} href={`/admin/${lang}/conversations/${conversation.id}`} className="block rounded-2xl border border-border bg-card p-5 transition hover:border-foreground/40 focus-visible:ring-2 focus-visible:ring-ring">
      <div className="flex flex-wrap items-center gap-3"><MessageSquareIcon className="size-5 text-muted-foreground" /><h2 className="font-semibold">{copy.anonymous} · {conversation.id.slice(0, 8)}</h2>{(conversation.pinned || conversation.hasPinnedMessages) && <PinIcon className="size-4 text-amber-500" aria-label={copy.pinned} />}<span className={`rounded-full px-2 py-1 text-xs ${conversation.status === "COMPLETE" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : conversation.status === "FAILED" ? "bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>{copy.turnStates[conversation.status as keyof typeof copy.turnStates]}</span><span className="ml-auto font-mono text-xs text-muted-foreground">{conversation.locale}</span></div>
      <p className="mt-3 line-clamp-2 text-sm leading-6">{conversation.preview}</p><time className="mt-3 block text-xs text-muted-foreground">{new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(conversation.lastActivityAt))} UTC</time>
    </Link>)}</div>
    {!schemaPending && !data.conversations.length && <p className="rounded-2xl border border-dashed border-border p-8 text-muted-foreground">{copy.empty}</p>}
    {data.pages > 1 && <nav className="mt-6 flex items-center justify-between text-sm">{data.page > 1 ? <Link href={href(data.page - 1)}>{copy.previous}</Link> : <span />}<span>{copy.page} {data.page} / {data.pages}</span>{data.page < data.pages ? <Link href={href(data.page + 1)}>{copy.next}</Link> : <span />}</nav>}
  </div>;
}
