import type { AtsArtifact, CoverLetterArtifact } from "@/lib/documents/schemas";
import { DocumentPaper, DocumentSection } from "./document-paper";

export function AtsDocument({
  value,
  locale,
}: {
  value: AtsArtifact;
  locale: "es" | "en";
}) {
  return (
    <DocumentPaper className="professional-document">
      <header className="border-b-2 border-neutral-950 pb-8">
        <h2 className="text-4xl leading-none font-semibold tracking-[-0.055em] sm:text-5xl">
          {value.name}
        </h2>
        <p className="mt-4 text-lg font-medium text-neutral-700">{value.headline}</p>
        <ul
          className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-neutral-600"
          aria-label={locale === "es" ? "Información de contacto" : "Contact information"}
        >
          {value.contact.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </header>

      <div className="mt-9 space-y-9">
        <DocumentSection title={locale === "es" ? "Resumen" : "Summary"}>
          <p className="text-[0.92rem] leading-6 text-neutral-800">{value.summary}</p>
        </DocumentSection>
        <DocumentSection title={locale === "es" ? "Habilidades" : "Skills"}>
          <p className="text-[0.86rem] leading-5.5 text-neutral-800">
            {value.skills.join(" · ")}
          </p>
        </DocumentSection>
        {value.experience.length > 0 && (
          <DocumentEntries
            title={locale === "es" ? "Experiencia" : "Experience"}
            entries={value.experience}
          />
        )}
        {value.projects.length > 0 && (
          <DocumentEntries
            title={locale === "es" ? "Proyectos" : "Projects"}
            entries={value.projects}
          />
        )}
        {value.education.length > 0 && (
          <DocumentEntries
            title={locale === "es" ? "Educación" : "Education"}
            entries={value.education}
          />
        )}
      </div>
    </DocumentPaper>
  );
}

export function CoverLetterDocument({ value }: { value: CoverLetterArtifact }) {
  return (
    <DocumentPaper className="professional-document text-[0.95rem] leading-7">
      <header className="border-b-2 border-neutral-950 pb-6">
        <h2 className="text-xl font-semibold tracking-[-0.025em]">{value.subject}</h2>
      </header>
      <div className="mt-12">
        <p>{value.salutation}</p>
        {value.paragraphs.map((paragraph, index) => (
          <p key={index} className="mt-5 text-neutral-800">
            {paragraph}
          </p>
        ))}
        <p className="mt-12">
          {value.closing}
          <br />
          <span className="font-semibold">{value.name}</span>
        </p>
      </div>
    </DocumentPaper>
  );
}

function DocumentEntries({
  title,
  entries,
}: {
  title: string;
  entries: Array<{
    title: string;
    subtitle: string;
    period: string;
    bullets: string[];
  }>;
}) {
  return (
    <DocumentSection title={title}>
      <div className="space-y-6">
        {entries.map((entry, index) => (
          <section key={`${entry.title}-${index}`} className="document-entry">
            <div className="document-entry-intro">
              <div className="document-entry-heading flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-5">
                <h3 className="text-base font-semibold tracking-[-0.02em]">
                  {entry.title}
                </h3>
                <p className="shrink-0 font-mono text-[0.66rem] tracking-[0.04em] text-neutral-600 uppercase">
                  {entry.period}
                </p>
              </div>
              <p className="mt-1 text-sm font-medium text-neutral-700">
                {entry.subtitle}
              </p>
            </div>
            {entry.bullets.length > 0 && (
              <ul className="mt-3 list-disc space-y-2 pl-5 text-[0.86rem] leading-5.5 text-neutral-800 marker:text-neutral-500">
                {entry.bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="pl-1">
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </DocumentSection>
  );
}
