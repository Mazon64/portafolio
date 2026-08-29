"use client";

import { useState, type FormEvent } from "react";
import { SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

type ContactFormCopy = {
  name: string;
  email: string;
  message: string;
  send: string;
  sending: string;
  pending: string;
  success: string;
  error: string;
};

export function ContactForm({
  copy,
  enabled,
}: {
  copy: ContactFormCopy;
  enabled: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );

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
        }),
      });

      if (!response.ok) throw new Error("Contact request failed.");
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const fieldClassName =
    "mt-2 w-full rounded-xl border border-background/25 bg-background/5 px-4 py-3 text-base text-background outline-none transition-colors placeholder:text-background/35 focus:border-background/70 focus:ring-2 focus:ring-background/20";

  return (
    <form
      onSubmit={submitMessage}
      className="mx-auto mt-10 w-full max-w-3xl text-left"
    >
      <fieldset disabled={!enabled || status === "sending"}>
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

        <div className="mt-6 flex flex-col items-center gap-4">
          <Button
            type="submit"
            size="lg"
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
          {!enabled && copy.pending}
          {status === "success" && copy.success}
          {status === "error" && copy.error}
        </p>
      </div>
    </form>
  );
}
