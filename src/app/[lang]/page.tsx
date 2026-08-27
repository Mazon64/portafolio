import type { ReactNode } from "react";
import {
  ArrowUpRightIcon,
  MailIcon,
  MessageCircleIcon,
} from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa6";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { hasLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils";

export default async function Home({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  const dictionary = await getDictionary(lang);
  const { home, navigation, preferences, sections, contact, chat } = dictionary;
  const navigationItems = [
    { href: "#about", label: navigation.about },
    { href: "#skills", label: navigation.skills },
    { href: "#projects", label: navigation.projects },
    { href: "#experience", label: navigation.experience },
    { href: "#education", label: navigation.education },
    { href: "#contact", label: navigation.contact },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {navigation.skipToContent}
      </a>
      <SiteHeader
        locale={lang}
        navigation={navigationItems}
        labels={{
          menu: navigation.menu,
          menuDescription: navigation.menuDescription,
          close: navigation.close,
          ...preferences,
        }}
      />

      <main id="main-content" tabIndex={-1}>
        <section className="relative isolate overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,color-mix(in_oklch,var(--foreground)_8%,transparent),transparent_32%)]" />
          <div className="mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl flex-col justify-end px-5 py-16 sm:px-8 sm:py-24 lg:py-28">
            <p className="mb-8 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
              {home.eyebrow}
            </p>
            <h1 className="max-w-5xl font-heading text-5xl font-semibold leading-[0.96] tracking-[-0.055em] sm:text-7xl lg:text-[6.5rem]">
              {home.heading}
            </h1>
            <div className="mt-12 grid gap-6 border-t border-border pt-6 md:grid-cols-2">
              <p className="font-heading text-lg font-medium">{home.name}</p>
              <p className="max-w-xl text-base leading-7 text-muted-foreground md:justify-self-end">
                {home.introduction}
              </p>
            </div>
          </div>
        </section>

        <PortfolioSection id="about" copy={sections.about} />
        <PortfolioSection id="skills" copy={sections.skills} />
        <PortfolioSection id="projects" copy={sections.projects} />
        <PortfolioSection id="experience" copy={sections.experience} />
        <PortfolioSection id="education" copy={sections.education} />

        <PortfolioSection id="contact" copy={sections.contact}>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap">
            <a
              href={siteConfig.contact.linkedin}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              <FaLinkedin aria-hidden="true" />
              {contact.linkedin}
              <ArrowUpRightIcon />
            </a>
            <a
              href={siteConfig.contact.github}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              <FaGithub aria-hidden="true" />
              {contact.github}
              <ArrowUpRightIcon />
            </a>
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className={cn(buttonVariants({ variant: "default", size: "lg" }))}
            >
              <MailIcon />
              {contact.email}
            </a>
          </div>
        </PortfolioSection>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-8 text-xs text-muted-foreground sm:px-8">
          <span>{siteConfig.name}</span>
          <span className="font-mono">{new Date().getFullYear()}</span>
        </div>
      </footer>

      <Button
        disabled
        size="icon-lg"
        className="fixed right-5 bottom-5 z-30 size-12 rounded-full shadow-lg sm:right-8 sm:bottom-8"
        aria-label={chat.label}
        aria-describedby="chat-status"
      >
        <MessageCircleIcon />
      </Button>
      <span id="chat-status" className="sr-only">
        {chat.unavailable}
      </span>
    </div>
  );
}

type PortfolioSectionProps = {
  id: string;
  copy: {
    number: string;
    title: string;
    description: string;
  };
  children?: ReactNode;
};

function PortfolioSection({ id, copy, children }: PortfolioSectionProps) {
  return (
    <section id={id} className="scroll-mt-16 border-b border-border">
      <div className="mx-auto grid min-h-[24rem] max-w-7xl gap-10 px-5 py-16 sm:px-8 sm:py-24 md:grid-cols-[minmax(0,0.65fr)_minmax(0,1.35fr)]">
        <div>
          <span className="font-mono text-xs text-muted-foreground">
            /{copy.number}
          </span>
        </div>
        <div className="flex max-w-3xl flex-col justify-between gap-12">
          <div>
            <h2 className="font-heading text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {copy.title}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              {copy.description}
            </p>
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
