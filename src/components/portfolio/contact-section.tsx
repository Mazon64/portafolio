import { ArrowUpRightIcon } from "lucide-react";

import type { ProfileDto } from "@/data/portfolio.types";
import type { Locale } from "@/i18n/config";

import { ContactForm } from "./contact-form";
import { SocialIcon } from "./social-icon";

type ContactCopy = {
  number: string;
  title: string;
  email: string;
  socialTitle: string;
  newTab: string;
  form: {
    name: string;
    email: string;
    message: string;
    send: string;
    sending: string;
    pending: string;
    success: string;
    error: string;
  };
};

export function ContactSection({
  profile,
  copy,
  locale,
}: {
  profile: ProfileDto;
  copy: ContactCopy;
  locale: Locale;
}) {
  const socialLinks = profile.socialLinks.map((link) => ({
    ...link,
    href: link.url,
    external: true,
  }));

  if (profile.email) {
    socialLinks.push({
      slug: "email",
      url: `mailto:${profile.email}`,
      href: `mailto:${profile.email}`,
      label: copy.email,
      detail: profile.email,
      iconKey: "email",
      external: false,
    });
  }

  return (
    <section
      id="contact"
      className="relative isolate scroll-mt-16 overflow-hidden bg-foreground text-background"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--background)_16%,transparent),transparent_42%)]" />
      <div className="mx-auto w-full max-w-[96rem] px-5 py-20 sm:px-8 sm:py-28 lg:px-12">
        <div className="relative">
          <span className="absolute top-1 left-0 font-mono text-xs text-background/60 sm:top-2">
            /{copy.number}
          </span>
          <h2 className="px-12 text-center text-balance font-heading text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            {copy.title}
          </h2>
        </div>
        <div className="mx-auto mt-6 max-w-5xl text-center">
          <p className="mx-auto max-w-2xl text-balance text-lg leading-8 text-background/70">
            {profile.contactText}
          </p>
          <ContactForm copy={copy.form} locale={locale} />

          <div className="mt-16 inline-block max-w-full text-left">
            <p className="font-mono text-xs tracking-[0.18em] text-background/55 uppercase">
              {copy.socialTitle}
            </p>
            <div className="mt-4 inline-grid max-w-full grid-cols-1 gap-4 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none">
              {socialLinks.map(
                ({ slug, href, label, detail, iconKey, external }) => (
                  <a
                    key={slug}
                    href={href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noreferrer" : undefined}
                    className="group flex min-h-40 min-w-52 flex-col justify-between rounded-2xl border border-background/20 bg-background/5 p-5 text-left text-background transition-colors hover:border-background/45 hover:bg-background/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/70"
                  >
                    <span className="flex min-w-0 items-center gap-4">
                      <SocialIcon iconKey={iconKey} />
                      {detail && (
                        <span className="min-w-0 break-all text-left font-mono text-sm leading-6 text-background/65">
                          {detail}
                        </span>
                      )}
                    </span>
                    <span className="mt-8 flex items-end justify-between gap-4">
                      <span className="font-heading text-xl font-semibold">
                        {label}
                      </span>
                      <ArrowUpRightIcon
                        className="size-4 shrink-0 text-background/55 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-background"
                        aria-hidden="true"
                      />
                    </span>
                    {external && (
                      <span className="sr-only">{copy.newTab}</span>
                    )}
                  </a>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
