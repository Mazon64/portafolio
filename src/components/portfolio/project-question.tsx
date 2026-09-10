"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { projectIntegrationCopy } from "@/i18n/project-integration";
import type { Locale } from "@/i18n/config";

type Answer = { answer: string; sources: Array<{ id: string; path: string; url: string }> };

export function ProjectQuestion({ slug, locale }: { slug: string; locale: Locale }) {
  const copy = projectIntegrationCopy[locale];
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setAnswer(null); setError("");
    try {
      const response = await fetch(`/api/projects/${encodeURIComponent(slug)}/ask`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ question, locale }), signal: AbortSignal.timeout(120_000),
      });
      if (!response.ok) { setError(response.status === 429 ? copy.rateLimited : copy.askError); return; }
      setAnswer(await response.json() as Answer);
    } catch { setError(copy.askError); }
    finally { setPending(false); }
  }
  return <section className="mt-8 rounded-xl border border-border bg-muted/20 p-5">
    <h4 className="text-xl font-semibold">{copy.askTitle}</h4>
    <p className="mt-2 text-sm text-muted-foreground">{copy.askHint}</p>
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="block text-sm font-medium">{copy.question}
        <textarea value={question} onChange={(e) => setQuestion(e.target.value)} minLength={5} maxLength={600} required disabled={pending} placeholder={copy.askPlaceholder}
          className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2" rows={3} />
      </label>
      <Button type="submit" disabled={pending}>{pending ? copy.asking : copy.ask}</Button>
    </form>
    <div aria-live="polite" className="mt-4 text-sm leading-7">
      {error && <p role="status">{error}</p>}
      {answer && <><p className="whitespace-pre-line">{answer.answer}</p><ul className="mt-3 flex flex-wrap gap-3">{answer.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{source.path}</a></li>)}</ul></>}
    </div>
  </section>;
}
