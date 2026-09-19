"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LoaderCircleIcon, MessageCircleIcon, PlusIcon, SendIcon, XIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { chatCopy } from "@/i18n/chat";
import type { Locale } from "@/i18n/config";
import type { ChatInput, ChatSessionDto, ChatTurnDto } from "@/lib/chat/schemas";
import { useSiteChat } from "./site-chat-context";

export function ChatWidget({ locale }: { locale: Locale }) {
  const copy = chatCopy[locale];
  const chat = useSiteChat();
  const [session, setSession] = useState<ChatSessionDto | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [restart, setRestart] = useState(false);
  const [retryInput, setRetryInput] = useState<ChatInput | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const previouslyOpen = useRef(false);
  const inFlight = useRef(false);
  const generation = useRef(0);
  const lastRequest = useRef<string | null>(null);

  const load = useCallback(async (before?: string) => {
    const version = generation.current;
    try {
      const response = await fetch(`/api/chat/session${before ? `?before=${encodeURIComponent(before)}` : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unavailable");
      const data = await response.json() as ChatSessionDto;
      if (generation.current !== version) return;
      setSession((previous) => before && previous && previous.conversation?.id === data.conversation?.id
        ? { ...data, turns: [...data.turns, ...previous.turns.filter((turn) => !data.turns.some((item) => item.id === turn.id))] }
        : data);
      if (data.turns.some((turn) => turn.requestId === lastRequest.current && turn.status === "COMPLETE")) { setRetryInput(null); setError(""); }
    } catch { setError(copy.unavailable); }
  }, [copy.unavailable]);
  useEffect(() => {
    if (!chat.open) return;
    const timer = setTimeout(() => void load(), 0);
    return () => clearTimeout(timer);
  }, [chat.open, load]);
  const waiting = session?.turns.some((turn) => turn.status === "PENDING") ?? false;
  useEffect(() => {
    if (!chat.open || !waiting || pending) return;
    const timer = setInterval(() => void load(), 3000);
    return () => clearInterval(timer);
  }, [chat.open, waiting, pending, load]);
  useEffect(() => { if (chat.open) end.current?.scrollIntoView({ block: "nearest" }); }, [chat.open, session?.turns.length, pending]);
  useEffect(() => { if (!chat.open && previouslyOpen.current) trigger.current?.focus(); previouslyOpen.current = chat.open; }, [chat.open]);
  useEffect(() => {
    if (!chat.open || pending) return;
    const frame = requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('textarea:not(:disabled), [data-chat-start], button')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [chat.open, chat.dock, pending, restart, session?.conversation?.id, session?.enabled]);

  async function start() {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError("");
    generation.current++;
    lastRequest.current = null;
    try {
      const response = await fetch("/api/chat/session", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accepted: true, locale, restart }) });
      if (!response.ok) { setError(response.status === 429 ? copy.rateLimit : copy.unavailable); return; }
      setSession(await response.json()); setRestart(false); setRetryInput(null); setDraft("");
    } catch { setError(copy.unavailable); }
    finally { inFlight.current = false; setPending(false); }
  }

  async function send(input: ChatInput) {
    if (inFlight.current) return;
    inFlight.current = true; setPending(true); setError(""); setRetryInput(input); setDraft("");
    lastRequest.current = input.requestId;
    try {
      const response = await fetch("/api/chat/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(240_000) });
      const data = await response.json();
      if (response.ok) { setSession(data); setRetryInput(null); }
      else {
        setError(response.status === 429 ? copy.rateLimit : response.status === 401 ? copy.expired : data.status === "busy" ? copy.busy : data.status === "conflict" ? copy.changed : data.saved ? copy.savedError : copy.unavailable);
        if (data.status === "conflict") setRetryInput(null);
        if (!data.saved) setDraft(input.message);
        await load();
      }
    } catch { setError(copy.connectionError); await load(); }
    finally { inFlight.current = false; setPending(false); }
  }

  function retry(turn: ChatTurnDto) {
    const user = turn.messages.find((message) => message.role === "USER");
    if (!user) return;
    if (!session?.conversation) return;
    void send({ conversationId: session.conversation.id, requestId: turn.requestId, message: user.content, locale: turn.locale, context: turn.context });
  }
  const content = <div data-print-hidden id="chat" onKeyDown={(event) => { if (event.key === "Escape" && chat.open) { event.stopPropagation(); chat.setOpen(false); } }} className="fixed right-4 bottom-4 z-[70] print:hidden sm:right-6 sm:bottom-6">
    {chat.open && <section ref={panel} role="region" aria-label={copy.title} className={`absolute right-0 bottom-16 flex w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl ${chat.dock ? "h-[min(32rem,calc(80dvh-6rem))]" : "h-[min(36rem,calc(100dvh-7rem))]"}`}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <div><h2 className="text-sm font-semibold">{copy.title}</h2><p className="text-xs text-muted-foreground">{copy.subtitle}</p></div>
        <div className="flex gap-1">
          {session?.conversation && <Button variant="ghost" size="icon-sm" aria-label={copy.newChat} disabled={pending || waiting} onClick={() => { setRestart(true); setError(""); }}><PlusIcon /></Button>}
          <Button variant="ghost" size="icon-sm" aria-label={copy.close} onClick={() => chat.setOpen(false)}><XIcon /></Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {!session && !error && <p role="status" className="text-sm text-muted-foreground">{copy.loading}</p>}
        {session?.enabled === false && <p className="text-sm leading-6 text-muted-foreground">{copy.unavailable}</p>}
        {session?.enabled && (!session.conversation || restart) && <div className="space-y-4">
          <p className="text-sm leading-6">{copy.welcome}</p><p className="rounded-xl bg-muted/50 p-3 text-sm leading-6 text-muted-foreground">{copy.notice}</p>
          {restart && <p className="text-xs text-muted-foreground">{copy.newChatHint}</p>}
          <div className="flex gap-2"><Button data-chat-start disabled={pending} onClick={start}>{copy.start}</Button><Button variant="ghost" onClick={() => restart ? setRestart(false) : chat.setOpen(false)}>{copy.later}</Button></div>
        </div>}
        {session?.conversation && !restart && <>
          {session.nextCursor && <Button size="sm" variant="ghost" onClick={() => void load(session.nextCursor!)}>{copy.older}</Button>}
          {!session.turns.length && <p className="text-sm leading-6 text-muted-foreground">{copy.welcome}</p>}
          <div role="log" aria-live="polite" aria-relevant="additions text" className="space-y-5">{session.turns.map((turn) => <div key={turn.id} className="space-y-3">{turn.messages.map((message) => <div key={message.id} className={message.role === "USER" ? "ml-7 rounded-2xl rounded-br-sm bg-foreground p-3 text-background" : "mr-3 rounded-2xl rounded-bl-sm bg-muted/50 p-3"}>
            <p className="mb-1 text-[0.65rem] font-semibold uppercase tracking-wide opacity-60">{message.role === "USER" ? copy.visitor : copy.assistant}</p>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.content}</p>
            {message.sources.length > 0 && <ul aria-label={copy.sources} className="mt-2 flex flex-wrap gap-2 text-xs">{message.sources.filter((source, index, sources) => sources.findIndex((s) => s.url === source.url) === index).map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="break-all underline underline-offset-4">{source.title}</a></li>)}</ul>}
          </div>)}
            {turn.status === "FAILED" && <Button variant="ghost" size="sm" disabled={pending || waiting} onClick={() => retry(turn)}><RotateCcwIcon />{copy.retry}</Button>}
          </div>)}</div>
          {retryInput && !session.turns.some((turn) => turn.requestId === retryInput.requestId) && (pending || error) && <div className="ml-7 mt-4 rounded-2xl rounded-br-sm bg-foreground p-3 text-background"><p className="text-sm leading-6">{retryInput.message}</p></div>}
          {(pending || waiting) && <p role="status" className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><LoaderCircleIcon className="size-4 animate-spin" />{copy.sending}</p>}
        </>}
        {error && <p role="status" className="mt-4 rounded-lg border border-border p-3 text-sm text-muted-foreground">{error}</p>}
        {retryInput && error && !session?.turns.some((turn) => turn.requestId === retryInput.requestId) && <Button variant="ghost" size="sm" disabled={pending} onClick={() => void send(retryInput)}>{copy.retry}</Button>}
        <div ref={end} />
      </div>
      {session?.conversation && !restart && <footer className="shrink-0 border-t border-border p-3">
        <p className="mb-2 truncate text-[0.65rem] text-muted-foreground" title={copy.contextHint}>{copy.context}: {copy.sections[chat.location.section]}{chat.location.projectSlug && ` · ${chat.location.projectSlug}`}</p>
        <form onSubmit={(event) => { event.preventDefault(); if (draft.trim()) void send({ conversationId: session.conversation!.id, requestId: crypto.randomUUID(), message: draft.trim(), locale, context: chat.location }); }} className="flex items-end gap-2">
          <label className="min-w-0 flex-1"><span className="sr-only">{copy.message}</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={2} maxLength={1200} required disabled={pending || waiting} placeholder={copy.placeholder} className="block max-h-32 w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" /></label>
          <Button type="submit" size="icon" aria-label={copy.send} disabled={pending || waiting || !draft.trim()}><SendIcon /></Button>
        </form>
      </footer>}
    </section>}
    <Button ref={trigger} type="button" aria-label={chat.open ? copy.close : copy.open} aria-expanded={chat.open} onClick={() => chat.setOpen(!chat.open)} className="size-13 rounded-full border border-border shadow-lg"><MessageCircleIcon className="size-6" /></Button>
  </div>;
  return chat.dock ? createPortal(content, chat.dock) : content;
}
