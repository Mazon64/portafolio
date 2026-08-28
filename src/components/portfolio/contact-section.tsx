import { ArrowUpRightIcon, MailIcon } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa6";

import { buttonVariants } from "@/components/ui/button";
import type { ProfileDto } from "@/data/portfolio.types";
import { cn } from "@/lib/utils";

type ContactCopy = {
  number: string;
  title: string;
  linkedin: string;
  github: string;
  email: string;
  newTab: string;
};

export function ContactSection({
  profile,
  copy,
}: {
  profile: ProfileDto;
  copy: ContactCopy;
}) {
  return (
    <section
      id="contact"
      className="relative isolate scroll-mt-16 overflow-hidden bg-foreground text-background"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklch,var(--background)_16%,transparent),transparent_42%)]" />
      <div className="mx-auto flex min-h-[32rem] w-full max-w-5xl flex-col items-center justify-center px-5 py-20 text-center sm:px-8 sm:py-28">
        <div className="relative left-1/2 w-screen -translate-x-1/2">
          <span className="absolute top-1 left-5 font-mono text-xs text-background/60 sm:top-2 sm:left-8 lg:left-[max(3rem,calc((100vw-96rem)/2+3rem))]">
            /{copy.number}
          </span>
          <h2 className="text-balance font-heading text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">
            {copy.title}
          </h2>
        </div>
        <p className="mt-6 max-w-2xl text-balance text-lg leading-8 text-background/70">
          {profile.contactText}
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {profile.linkedinUrl && (
            <a
              href={profile.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-background/30 bg-transparent text-background hover:bg-background hover:text-foreground dark:border-background/30 dark:bg-transparent dark:hover:bg-background dark:hover:text-foreground",
              )}
            >
              <FaLinkedin aria-hidden="true" />
              {copy.linkedin}
              <ArrowUpRightIcon aria-hidden="true" />
              <span className="sr-only">{copy.newTab}</span>
            </a>
          )}
          {profile.githubUrl && (
            <a
              href={profile.githubUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-background/30 bg-transparent text-background hover:bg-background hover:text-foreground dark:border-background/30 dark:bg-transparent dark:hover:bg-background dark:hover:text-foreground",
              )}
            >
              <FaGithub aria-hidden="true" />
              {copy.github}
              <ArrowUpRightIcon aria-hidden="true" />
              <span className="sr-only">{copy.newTab}</span>
            </a>
          )}
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-background text-foreground hover:bg-background/85",
              )}
            >
              <MailIcon aria-hidden="true" />
              {copy.email}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
