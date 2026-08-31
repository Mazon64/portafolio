import type { Dictionary } from "../../i18n/dictionaries";
import type { Locale } from "../../i18n/config";
import type { PortfolioDto } from "../../data/portfolio.types";
import { siteConfig } from "../../config/site";
import { formatDateRange } from "../../lib/format-date-range";

type CvCopy = Dictionary["cv"];

function CvSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="cv-section">
      <h2 className="border-b border-neutral-300 pb-2 font-mono text-[0.68rem] font-semibold tracking-[0.16em] text-neutral-600 uppercase">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function CvDocument({
  portfolio,
  locale,
  copy,
}: {
  portfolio: PortfolioDto;
  locale: Locale;
  copy: CvCopy;
}) {
  const { profile, experience, education, projects, skillCategories } =
    portfolio;

  return (
    <article className="cv-document mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white p-7 text-neutral-950 shadow-2xl shadow-black/10 sm:p-12 lg:p-16">
      <header className="grid gap-8 border-b-2 border-neutral-950 pb-8 sm:grid-cols-[minmax(0,1.4fr)_minmax(13rem,0.6fr)] sm:items-end">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold tracking-[0.18em] text-neutral-500 uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 max-w-xl text-4xl leading-none font-semibold tracking-[-0.055em] sm:text-5xl">
            {profile.fullName}
          </h1>
          <p className="mt-4 text-lg font-medium text-neutral-600">
            {profile.title}
          </p>
        </div>

        <address className="space-y-2 text-sm leading-5 not-italic sm:text-right">
          {profile.email && (
            <p>
              <a href={`mailto:${profile.email}`} className="cv-link">
                {profile.email}
              </a>
            </p>
          )}
          <p>
            <a href={siteConfig.url} className="cv-link">
              <span className="sr-only">{copy.website}: </span>
              {siteConfig.domain}
            </a>
          </p>
          {profile.socialLinks.map((link) => (
            <p key={link.slug}>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="cv-link"
                aria-label={`${link.label}: ${link.detail ?? link.url}. ${copy.newTab}`}
              >
                {link.label}
                {link.detail ? ` · ${link.detail}` : ""}
              </a>
            </p>
          ))}
        </address>
      </header>

      <CvSection title={copy.summary}>
        <div className="space-y-3 text-[0.92rem] leading-6 text-neutral-700">
          {profile.longBio.split(/\n+/).map((paragraph, index) => (
            <p key={`summary-${index}`}>{paragraph}</p>
          ))}
        </div>
      </CvSection>

      <div className="cv-columns mt-9 grid gap-9 md:grid-cols-[minmax(0,1.45fr)_minmax(13rem,0.75fr)]">
        <div className="space-y-9">
          {experience.length > 0 && (
            <CvSection title={copy.experience}>
              <ol className="space-y-6">
                {experience.map((item) => (
                  <li key={item.slug} className="cv-entry">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
                      <h3 className="text-base font-semibold tracking-[-0.02em]">
                        {item.role}
                      </h3>
                      <p className="shrink-0 font-mono text-[0.66rem] tracking-[0.04em] text-neutral-500 uppercase">
                        {formatDateRange(
                          item.startDate,
                          item.endDate,
                          locale,
                        )}
                      </p>
                    </div>
                    <p className="mt-1 text-sm font-medium text-neutral-600">
                      {item.company}
                    </p>
                    <div className="mt-3 space-y-2 text-[0.86rem] leading-5.5 text-neutral-700">
                      {item.description.split(/\n+/).map((paragraph, index) => (
                        <p key={`${item.slug}-description-${index}`}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            </CvSection>
          )}

          {projects.length > 0 && (
            <CvSection title={copy.projects}>
              <ol className="space-y-6">
                {projects.map((project) => (
                  <li key={project.slug} className="cv-entry">
                    <h3 className="text-base font-semibold tracking-[-0.02em]">
                      {project.name}
                    </h3>
                    <p className="mt-2 text-[0.86rem] leading-5.5 text-neutral-700">
                      {project.summary}
                    </p>
                    {project.techStack.length > 0 && (
                      <p className="mt-2 font-mono text-[0.66rem] leading-5 tracking-[0.04em] text-neutral-500 uppercase">
                        {project.techStack.join(" · ")}
                      </p>
                    )}
                    {(project.repositoryUrl || project.demoUrl) && (
                      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
                        {project.repositoryUrl && (
                          <a
                            href={project.repositoryUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="cv-link"
                          >
                            {copy.repository}
                          </a>
                        )}
                        {project.demoUrl && (
                          <a
                            href={project.demoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="cv-link"
                          >
                            {copy.prototype}
                          </a>
                        )}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </CvSection>
          )}
        </div>

        <aside className="space-y-9">
          {skillCategories.length > 0 && (
            <CvSection title={copy.skills}>
              <div className="space-y-5">
                {skillCategories.map((category) => (
                  <div key={category.slug} className="cv-entry">
                    <h3 className="text-sm font-semibold">
                      {category.title}
                    </h3>
                    <p className="mt-2 text-[0.8rem] leading-5 text-neutral-700">
                      {category.skills.map((skill) => skill.name).join(" · ")}
                    </p>
                  </div>
                ))}
              </div>
            </CvSection>
          )}

          {education.length > 0 && (
            <CvSection title={copy.education}>
              <ol className="space-y-5">
                {education.map((item) => (
                  <li key={item.slug} className="cv-entry">
                    <h3 className="text-sm leading-5 font-semibold">
                      {item.degree}
                    </h3>
                    <p className="mt-1 text-[0.8rem] leading-5 text-neutral-600">
                      {item.institution}
                    </p>
                    <p className="mt-2 font-mono text-[0.65rem] leading-4 tracking-[0.04em] text-neutral-500 uppercase">
                      {formatDateRange(
                        item.startDate,
                        item.endDate,
                        locale,
                      )}
                    </p>
                  </li>
                ))}
              </ol>
            </CvSection>
          )}
        </aside>
      </div>
    </article>
  );
}
