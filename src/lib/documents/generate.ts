import "server-only";

import { DocumentKind, Locale, Prisma } from "@/generated/prisma/client";
import type { Locale as AppLocale } from "@/i18n/config";
import { getCvContent } from "@/data/portfolio";
import {
  createApplicationArtifacts,
  createPublicCvDraft,
  getLatestAiContext,
} from "@/data/admin/documents";
import { formatDateRange } from "@/lib/format-date-range";
import { generateStructuredDocument } from "./gemini";
import {
  atsArtifactSchema,
  atsGenerationSchema,
  coverLetterArtifactSchema,
  coverLetterGenerationSchema,
  publicCvArtifactSchema,
  publicCvGenerationSchema,
} from "./schemas";
import { createSourceHash } from "./source-hash";

const databaseLocale: Record<AppLocale, Locale> = { es: Locale.ES, en: Locale.EN };

const publicCvResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "experience", "projects"],
  properties: {
    summary: { type: "string" },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slug", "description"],
        properties: { slug: { type: "string" }, description: { type: "string" } },
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slug", "summary"],
        properties: { slug: { type: "string" }, summary: { type: "string" } },
      },
    },
  },
};

const atsResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "summary", "skills", "experience", "projects"],
  properties: {
    headline: { type: "string" },
    summary: { type: "string" },
    skills: { type: "array", items: { type: "string" } },
    experience: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slug", "bullets"],
        properties: {
          slug: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slug", "bullets"],
        properties: {
          slug: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

const coverResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["subject", "salutation", "paragraphs", "closing"],
  properties: {
    subject: { type: "string" },
    salutation: { type: "string" },
    paragraphs: { type: "array", items: { type: "string" } },
    closing: { type: "string" },
  },
};

function requireMatchingSlugs(
  expected: string[],
  generated: Array<{ slug: string }>,
) {
  const actual = generated.map(({ slug }) => slug);
  if (
    expected.length !== actual.length ||
    expected.some((slug) => !actual.includes(slug)) ||
    new Set(actual).size !== actual.length
  ) {
    throw new Error("Generated document does not match source records");
  }
}

export async function generatePublicCvDraft(locale: AppLocale) {
  const [portfolio, context] = await Promise.all([getCvContent(locale), getLatestAiContext()]);
  const source = {
    locale,
    professionalContext: context?.professionalContext ?? "",
    portfolio,
  };
  const generated = await generateStructuredDocument({
    instruction:
      locale === "es"
        ? "Redacta un CV público profesional en español. Conserva exactamente cada slug y devuelve una síntesis clara, natural y verificable."
        : "Write a professional public CV in English. Preserve every slug exactly and return clear, natural, verifiable copy.",
    source,
    responseSchema: publicCvResponseSchema,
    validator: publicCvGenerationSchema,
  });
  requireMatchingSlugs(
    portfolio.experience.map(({ slug }) => slug),
    generated.content.experience,
  );
  requireMatchingSlugs(
    portfolio.projects.map(({ slug }) => slug),
    generated.content.projects,
  );

  const descriptions = new Map(
    generated.content.experience.map(({ slug, description }) => [slug, description]),
  );
  const summaries = new Map(
    generated.content.projects.map(({ slug, summary }) => [slug, summary]),
  );
  const artifact = publicCvArtifactSchema.parse({
    type: "public_cv",
    portfolio: {
      ...portfolio,
      profile: { ...portfolio.profile, longBio: generated.content.summary },
      experience: portfolio.experience.map((item) => ({
        ...item,
        description: descriptions.get(item.slug),
      })),
      projects: portfolio.projects.map((item) => ({
        ...item,
        summary: summaries.get(item.slug),
      })),
    },
  });
  return createPublicCvDraft({
    locale: databaseLocale[locale],
    title: locale === "es" ? "CV público" : "Public CV",
    content: artifact as Prisma.InputJsonValue,
    sourceHash: createSourceHash({
      portfolio,
      professionalContext: context?.professionalContext ?? "",
    }),
    model: generated.model,
  });
}

export async function generateApplicationDocuments(input: {
  locale: AppLocale;
  company: string;
  role: string;
  sourceUrl: string | null;
  jobDescription: string;
  notes: string | null;
}) {
  const [portfolio, context] = await Promise.all([
    getCvContent(input.locale),
    getLatestAiContext(),
  ]);
  const sharedSource = {
    target: {
      company: input.company,
      role: input.role,
      sourceUrl: input.sourceUrl,
      jobDescription: input.jobDescription,
    },
    professionalContext: context?.professionalContext ?? "",
    portfolio,
  };
  const language = input.locale === "es" ? "Spanish" : "English";
  const [atsGenerated, coverGenerated] = await Promise.all([
    generateStructuredDocument({
      instruction: `Create a one-column ATS CV tailored to the supplied vacancy in ${language}. Preserve every experience and project slug exactly. Return skills only as slugs present in the portfolio. Prioritize relevant facts without adding claims.`,
      source: sharedSource,
      responseSchema: atsResponseSchema,
      validator: atsGenerationSchema,
    }),
    generateStructuredDocument({
      instruction: `Write a concise cover letter for the supplied vacancy in ${language}. Connect only documented experience to the role and avoid generic claims.`,
      source: {
        ...sharedSource,
        personalContext: context?.personalContext ?? "",
      },
      responseSchema: coverResponseSchema,
      validator: coverLetterGenerationSchema,
    }),
  ]);
  requireMatchingSlugs(
    portfolio.experience.map(({ slug }) => slug),
    atsGenerated.content.experience,
  );
  const canonicalSkills = new Map(
    portfolio.skillCategories.flatMap((category) =>
      category.skills.map((skill) => [skill.slug, skill.name] as const),
    ),
  );
  if (
    new Set(atsGenerated.content.skills).size !== atsGenerated.content.skills.length ||
    atsGenerated.content.skills.some((slug) => !canonicalSkills.has(slug))
  ) {
    throw new Error("Generated document contains unknown skills");
  }
  requireMatchingSlugs(
    portfolio.projects.map(({ slug }) => slug),
    atsGenerated.content.projects,
  );

  const experienceBullets = new Map(
    atsGenerated.content.experience.map(({ slug, bullets }) => [slug, bullets]),
  );
  const projectBullets = new Map(
    atsGenerated.content.projects.map(({ slug, bullets }) => [slug, bullets]),
  );
  const ats = atsArtifactSchema.parse({
    type: "ats_cv",
    locale: input.locale,
    name: portfolio.profile.fullName,
    headline: atsGenerated.content.headline,
    contact: [portfolio.profile.email, ...portfolio.profile.socialLinks.map(({ url }) => url)].filter(
      (value): value is string => Boolean(value),
    ),
    summary: atsGenerated.content.summary,
    skills: atsGenerated.content.skills.map((slug) => canonicalSkills.get(slug)),
    experience: portfolio.experience.map((item) => ({
      title: item.role,
      subtitle: item.company,
      period: formatDateRange(item.startDate, item.endDate, input.locale),
      bullets: experienceBullets.get(item.slug),
    })),
    education: portfolio.education.map((item) => ({
      title: item.degree,
      subtitle: item.institution,
      period: formatDateRange(item.startDate, item.endDate, input.locale),
      bullets: [],
    })),
    projects: portfolio.projects.map((item) => ({
      title: item.name,
      subtitle: item.techStack.join(" · ") || item.name,
      period: "-",
      bullets: projectBullets.get(item.slug),
    })),
  });
  const cover = coverLetterArtifactSchema.parse({
    type: "cover_letter",
    locale: input.locale,
    ...coverGenerated.content,
    name: portfolio.profile.fullName,
  });
  const sourceHash = createSourceHash({
    ...sharedSource,
    personalContext: context?.personalContext ?? "",
  });
  return createApplicationArtifacts({
    ...input,
    locale: databaseLocale[input.locale],
    sourceHash,
    model: atsGenerated.model,
    atsTitle: `${input.role} · ${input.company} · ATS CV`,
    atsContent: ats as Prisma.InputJsonValue,
    coverTitle: `${input.role} · ${input.company} · Cover letter`,
    coverContent: cover as Prisma.InputJsonValue,
  });
}

export { DocumentKind };
