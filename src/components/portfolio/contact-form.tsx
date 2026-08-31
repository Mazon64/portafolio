"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { SendIcon } from "lucide-react";
import Script from "next/script";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";

type ContactFormCopy = {
  name: string;
  email: string;
  message: string;
  send: string;
  sending: string;
  success: string;
  error: string;
};

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      appearance: "interaction-only";
      size: "flexible";
      theme: "dark";
      callback: (token: string) => void;
      "error-callback": () => void;
      "expired-callback": () => void;
      "timeout-callback": () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
  reset: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function ContactForm({
  copy,
  locale,
}: {
  copy: ContactFormCopy;
  locale: Locale;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );
  const [turnstileSiteKey, setTurnstileSiteKey] = useState<
    string | null | undefined
  >();
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetIdRef = useRef<string>(null);

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/contact", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Contact configuration failed.");
        return (await response.json()) as { turnstileSiteKey?: unknown };
      })
      .then(({ turnstileSiteKey: siteKey }) => {
        setTurnstileSiteKey(
          typeof siteKey === "string" && siteKey ? siteKey : null,
        );
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setTurnstileSiteKey(null);
      });

    return () => controller.abort();
  }, []);

  useEffect(
    () => () => {
      const widgetId = turnstileWidgetIdRef.current;
      if (widgetId) {
        window.turnstile?.remove(widgetId);
        turnstileWidgetIdRef.current = null;
      }
    },
    [],
  );

  function renderTurnstile() {
    if (
      !turnstileSiteKey ||
      !turnstileContainerRef.current ||
      !window.turnstile ||
      turnstileWidgetIdRef.current
    ) {
      return;
    }

    turnstileWidgetIdRef.current = window.turnstile.render(
      turnstileContainerRef.current,
      {
        sitekey: turnstileSiteKey,
        action: "contact",
        appearance: "interaction-only",
        size: "flexible",
        theme: "dark",
        callback: setTurnstileToken,
        "error-callback": () => setTurnstileToken(""),
        "expired-callback": () => setTurnstileToken(""),
        "timeout-callback": () => setTurnstileToken(""),
      },
    );
  }

  function resetTurnstile() {
    setTurnstileToken("");
    const widgetId = turnstileWidgetIdRef.current;
    if (widgetId) window.turnstile?.reset(widgetId);
  }

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          message: data.get("message"),
          website: data.get("website"),
          turnstileToken,
          locale,
        }),
      });

      if (!response.ok) throw new Error("Contact request failed.");
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    } finally {
      resetTurnstile();
    }
  }

  const fieldClassName =
    "mt-2 w-full rounded-xl border border-background/25 bg-background/5 px-4 py-3 text-base text-background outline-none transition-colors placeholder:text-background/35 focus:border-background/70 focus:ring-2 focus:ring-background/20";

  return (
    <form
      onSubmit={submitMessage}
      className="mx-auto mt-10 w-full max-w-3xl text-left"
    >
      <fieldset disabled={status === "sending"}>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-background/80">
            {copy.name}
            <input
              required
              name="name"
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={100}
              className={fieldClassName}
            />
          </label>
          <label className="text-sm font-medium text-background/80">
            {copy.email}
            <input
              required
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              className={fieldClassName}
            />
          </label>
        </div>

        <label className="mt-5 block text-sm font-medium text-background/80">
          {copy.message}
          <textarea
            required
            name="message"
            rows={6}
            minLength={10}
            maxLength={5000}
            className={`${fieldClassName} resize-y`}
          />
        </label>

        <label className="absolute -left-[9999px]" aria-hidden="true">
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>

        {turnstileSiteKey && (
          <div className="mx-auto mt-6 w-full max-w-80">
            <Script
              id="cloudflare-turnstile"
              src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
              strategy="afterInteractive"
              onReady={renderTurnstile}
            />
            <div ref={turnstileContainerRef} />
          </div>
        )}

        <div className="mt-6 flex flex-col items-center gap-4">
          <Button
            type="submit"
            size="lg"
            disabled={
              turnstileSiteKey === undefined ||
              (Boolean(turnstileSiteKey) && !turnstileToken)
            }
            className="min-w-40 bg-background text-foreground hover:bg-background/85"
          >
            <SendIcon aria-hidden="true" />
            {status === "sending" ? copy.sending : copy.send}
          </Button>
        </div>
      </fieldset>
      <div className="mt-4 flex flex-col items-center">
        <p
          aria-live="polite"
          className="min-h-5 text-center text-sm text-background/70"
        >
          {status === "success" && copy.success}
          {status === "error" && copy.error}
        </p>
      </div>
    </form>
  );
}
