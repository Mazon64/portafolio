import { getPortfolioContent } from "@/data/portfolio";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

import { AboutSection } from "./about-section";
import { ContactSection } from "./contact-section";
import { PortfolioSection } from "./portfolio-section";
import { ProjectsSection } from "./projects-section";
import { SkillsSection } from "./skills-section";
import { TimelineSection } from "./timeline-section";

export async function PortfolioContent({
  locale,
  dictionary,
}: {
  locale: Locale;
  dictionary: Dictionary;
}) {
  const portfolio = await getPortfolioContent(locale);
  const { profile } = portfolio;

  return (
    <>
      <section
        id="hero"
        className="relative isolate scroll-mt-16 overflow-hidden border-b border-border"
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,color-mix(in_oklch,var(--foreground)_8%,transparent),transparent_32%)]" />
        <div className="mx-auto flex min-h-svh w-full max-w-[96rem] flex-col justify-end px-5 py-16 sm:px-8 sm:py-24 lg:px-12 lg:py-28 xl:min-h-[calc(100svh-4rem)]">
          <p className="mb-8 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground">
            {dictionary.home.eyebrow}
          </p>
          <h1 className="max-w-6xl text-balance font-heading text-5xl font-semibold leading-[0.93] tracking-[-0.06em] sm:text-7xl lg:text-[6.5rem]">
            {profile.fullName}
          </h1>
          <p className="mt-7 font-heading text-xl font-medium sm:text-2xl">
            {profile.title}
          </p>
          <p className="mt-12 max-w-xl border-t border-border pt-6 font-heading text-lg font-medium leading-7">
            {dictionary.home.heading}
          </p>
        </div>
      </section>

      <AboutSection
        copy={dictionary.sections.about}
        biography={profile.longBio}
      />

      <PortfolioSection
        id="skills"
        copy={dictionary.sections.skills}
        flushBottom
      >
        <SkillsSection
          categories={portfolio.skillCategories}
          copy={dictionary.skillsCarousel}
        />
      </PortfolioSection>

      <PortfolioSection id="projects" copy={dictionary.sections.projects}>
        <ProjectsSection
          projects={portfolio.projects}
          copy={dictionary.projects}
        />
      </PortfolioSection>

      <PortfolioSection id="experience" copy={dictionary.sections.experience}>
        <TimelineSection
          locale={locale}
          items={portfolio.experience.map((item) => ({
            key: item.slug,
            title: item.role,
            subtitle: item.company,
            description: item.description,
            startDate: item.startDate,
            endDate: item.endDate,
          }))}
        />
      </PortfolioSection>

      <PortfolioSection id="education" copy={dictionary.sections.education}>
        <TimelineSection
          locale={locale}
          items={portfolio.education.map((item) => ({
            key: item.slug,
            title: item.degree,
            subtitle: item.institution,
            startDate: item.startDate,
            endDate: item.endDate,
          }))}
        />
      </PortfolioSection>

      <ContactSection profile={profile} copy={dictionary.contact} />

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-[96rem] items-center justify-between px-5 py-8 text-xs text-muted-foreground sm:px-8 lg:px-12">
          <span>{profile.fullName}</span>
          <span className="font-mono">{new Date().getFullYear()}</span>
        </div>
      </footer>
    </>
  );
}
