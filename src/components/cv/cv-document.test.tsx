import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { PortfolioDto } from "../../data/portfolio.types";
import type { Dictionary } from "../../i18n/dictionaries";
import englishDictionary from "../../i18n/dictionaries/en.json";
import spanishDictionary from "../../i18n/dictionaries/es.json";

import { CvDocument } from "./cv-document";

const copy: Dictionary["cv"] = {
  metadata: { title: "Résumé", description: "Professional résumé" },
  eyebrow: "Curriculum vitae",
  summary: "Professional summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  languages: "Languages",
  languageItems: [
    { name: "Spanish", proficiency: "Native speaker" },
    { name: "English", proficiency: "Comfortable communicating in professional settings" },
  ],
  projects: "Selected projects",
  print: "Print",
  backToPortfolio: "Back",
  website: "Website",
  repository: "Repository",
  prototype: "Prototype",
  newTab: "Opens in a new tab",
  loading: "Loading résumé",
};

function portfolio(): PortfolioDto {
  return {
    profile: {
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      title: "Software Engineer",
      longBio: "Builds analytical systems.\n\nDocuments every decision.",
      contactText: "Contact Ada",
      socialLinks: [
        {
          slug: "github",
          label: "GitHub",
          detail: "@ada",
          url: "https://github.com/ada",
          iconKey: "github",
        },
      ],
    },
    experience: [
      {
        slug: "analytical-engine",
        company: "Babbage Labs",
        startDate: "2020-01-01",
        endDate: null,
        role: "Engineer",
        description: "Designed an analytical engine.",
      },
    ],
    education: [
      {
        slug: "mathematics",
        institution: "University of London",
        startDate: "2016-08-01",
        endDate: "2020-06-30",
        degree: "Mathematics",
      },
    ],
    projects: [
      {
        slug: "notes",
        name: "Notes",
        summary: "Computing notes.",
        detailedInfo: "Detailed computing notes.",
        demoUrl: null,
        repositoryUrl: "https://github.com/ada/notes",
        techStack: ["TypeScript", "PostgreSQL"],
        status: "completed",
        progressPct: 100,
        lastTelemetryAt: null,
      },
    ],
    skillCategories: [
      {
        slug: "engineering",
        presentation: "badges",
        title: "Engineering",
        description: "Core capabilities",
        skills: [
          { slug: "algorithms", name: "Algorithms", iconKey: null },
          { slug: "architecture", name: "Architecture", iconKey: null },
        ],
      },
    ],
  };
}

describe("CvDocument", () => {
  it("renders localized professional content and links", () => {
    const html = renderToStaticMarkup(
      <CvDocument portfolio={portfolio()} locale="en" copy={copy} />,
    );

    expect(html).toContain("Professional summary");
    expect(html).toContain("January 2020 - Present");
    expect(html).toContain("TypeScript · PostgreSQL");
    expect(html).toContain("Algorithms · Architecture");
    expect(html).toContain("Native speaker");
    expect(html).toContain("Comfortable communicating in professional settings");
    expect(html).toContain('href="mailto:ada@example.com"');
    expect(html).toContain('href="https://github.com/ada/notes"');
  });

  it("omits the projects section when no project is selected for the CV", () => {
    const data = portfolio();
    data.projects = [];

    const html = renderToStaticMarkup(
      <CvDocument portfolio={data} locale="en" copy={copy} />,
    );

    expect(html).not.toContain("Selected projects");
  });

  it("keeps the professional narrative before the complementary sidebar", () => {
    const html = renderToStaticMarkup(
      <CvDocument portfolio={portfolio()} locale="en" copy={copy} />,
    );

    expect(html).toContain("cv-columns");
    expect(html.indexOf("Professional summary")).toBeLessThan(
      html.indexOf("Experience"),
    );
    expect(html.indexOf("Experience")).toBeLessThan(
      html.indexOf("Selected projects"),
    );
    expect(html.indexOf("Selected projects")).toBeLessThan(
      html.indexOf("Education"),
    );
    expect(html.indexOf("Education")).toBeLessThan(html.indexOf("Skills"));
  });

  it("describes language proficiency naturally in both locales", () => {
    expect(spanishDictionary.cv.languageItems).toEqual([
      { name: "Español", proficiency: "Lengua materna" },
      { name: "Inglés", proficiency: "Comunicación fluida en entornos profesionales" },
    ]);
    expect(englishDictionary.cv.languageItems).toEqual([
      { name: "Spanish", proficiency: "Native speaker" },
      { name: "English", proficiency: "Comfortable communicating in professional settings" },
    ]);
  });
});
