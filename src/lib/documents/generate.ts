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
import { createDocumentDraftProof, verifyDocumentDraftProof } from "./draft-proof";
import { generateStructuredDocument } from "./gemini";
import {
  atsArtifactSchema,
  atsGenerationSchema,
  coverLetterArtifactSchema,
  coverLetterGenerationSchema,
  publicCvArtifactSchema,
  publicCvGenerationSchema,
} from "./schemas";
import type {
  AtsGeneration,
  CoverLetterGeneration,
  PublicCvGeneration,
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

export type PublicCvDraft = {
  draftId: string;
  locale: AppLocale;
  sourceHash: string;
  model: string;
  proof: string;
  content: PublicCvGeneration;
  experienceLabels: Array<{ slug: string; label: string }>;
  projectLabels: Array<{ slug: string; label: string }>;
};

export type ApplicationDocumentInput = {
  locale: AppLocale;
  company: string;
  role: string;
  sourceUrl: string | null;
  jobDescription: string;
  notes: string | null;
};

export type ApplicationDocumentsDraft = {
  draftId: string;
  application: ApplicationDocumentInput;
  sourceHash: string;
  model: string;
  proof: string;
  ats: AtsGeneration;
  cover: CoverLetterGeneration;
  experienceLabels: Array<{ slug: string; label: string }>;
  projectLabels: Array<{ slug: string; label: string }>;
  skillLabels: Array<{ slug: string; label: string }>;
};

export class DocumentSourceConflictError extends Error {
  constructor() {
    super("Document sources changed before the draft was saved");
    this.name = "DocumentSourceConflictError";
  }
}

export class InvalidDocumentDraftError extends Error {
  constructor() {
    super("Document draft proof is invalid");
    this.name = "InvalidDocumentDraftError";
  }
}

export async function generatePublicCvDraft(locale: AppLocale): Promise<PublicCvDraft> {
  const [portfolio, context] = await Promise.all([getCvContent(locale), getLatestAiContext()]);
  const source = {
    locale,
    professionalContext: context?.professionalContext ?? "",
    portfolio,
  };
  const generated = await generateStructuredDocument({
    instruction:
      locale === "es"
        ? "Redacta un CV público profesional en español y en primera persona, como si lo hubiera escrito el candidato. Conserva exactamente cada slug y devuelve una síntesis clara, natural y verificable."
        : "Write a professional public CV in English and in the first person, as if authored by the candidate. Preserve every slug exactly and return clear, natural, verifiable copy.",
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

  const draftId = crypto.randomUUID();
  const sourceHash = createSourceHash({
    portfolio,
    professionalContext: context?.professionalContext ?? "",
  });
  const proofValue = { draftId, locale, sourceHash, model: generated.model };
  return {
    ...proofValue,
    proof: createDocumentDraftProof(proofValue),
    locale,
    content: generated.content,
    experienceLabels: portfolio.experience.map((item) => ({
      slug: item.slug,
      label: `${item.role} · ${item.company}`,
    })),
    projectLabels: portfolio.projects.map((item) => ({ slug: item.slug, label: item.name })),
  };
}

export async function savePublicCvDraft(
  input: Omit<PublicCvDraft, "experienceLabels" | "projectLabels">,
) {
  const proofValue = {
    draftId: input.draftId,
    locale: input.locale,
    sourceHash: input.sourceHash,
    model: input.model,
  };
  if (!verifyDocumentDraftProof(proofValue, input.proof)) {
    throw new InvalidDocumentDraftError();
  }
  const [portfolio, context] = await Promise.all([
    getCvContent(input.locale),
    getLatestAiContext(),
  ]);
  const sourceHash = createSourceHash({
    portfolio,
    professionalContext: context?.professionalContext ?? "",
  });
  if (sourceHash !== input.sourceHash) {
    throw new DocumentSourceConflictError();
  }
  const content = publicCvGenerationSchema.parse(input.content);
  requireMatchingSlugs(
    portfolio.experience.map(({ slug }) => slug),
    content.experience,
  );
  requireMatchingSlugs(
    portfolio.projects.map(({ slug }) => slug),
    content.projects,
  );
  const descriptions = new Map(
    content.experience.map(({ slug, description }) => [slug, description]),
  );
  const summaries = new Map(content.projects.map(({ slug, summary }) => [slug, summary]));
  const artifact = publicCvArtifactSchema.parse({
    type: "public_cv",
    portfolio: {
      ...portfolio,
      profile: { ...portfolio.profile, longBio: content.summary },
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
    id: input.draftId,
    locale: databaseLocale[input.locale],
    title: input.locale === "es" ? "CV público" : "Public CV",
    content: artifact as Prisma.InputJsonValue,
    sourceHash,
    model: input.model,
  });
}

export async function generateApplicationDocuments(
  input: ApplicationDocumentInput,
): Promise<ApplicationDocumentsDraft> {
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
      instruction: `Create a one-column ATS CV tailored to the supplied vacancy in ${language}. Write narrative content in the first person as if authored by the candidate; bullets may use concise action verbs with an implied first person. Preserve every experience and project slug exactly. Return skills only as slugs present in the portfolio. Prioritize relevant facts without adding claims.`,
      source: sharedSource,
      responseSchema: atsResponseSchema,
      validator: atsGenerationSchema,
    }),
    generateStructuredDocument({
      instruction: `Write a concise cover letter for the supplied vacancy in ${language}, in the first person as if authored by the candidate. Connect only documented experience to the role and avoid generic claims.`,
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

  const sourceHash = createSourceHash({
    ...sharedSource,
    personalContext: context?.personalContext ?? "",
  });
  const draftId = crypto.randomUUID();
  const proofValue = {
    draftId,
    application: input,
    sourceHash,
    model: atsGenerated.model,
  };
  return {
    ...proofValue,
    proof: createDocumentDraftProof(proofValue),
    application: input,
    ats: atsGenerated.content,
    cover: coverGenerated.content,
    experienceLabels: portfolio.experience.map((item) => ({
      slug: item.slug,
      label: `${item.role} · ${item.company}`,
    })),
    projectLabels: portfolio.projects.map((item) => ({ slug: item.slug, label: item.name })),
    skillLabels: [...canonicalSkills].map(([slug, label]) => ({ slug, label })),
  };
}

export async function saveApplicationDocuments(
  input: Omit<ApplicationDocumentsDraft, "experienceLabels" | "projectLabels" | "skillLabels">,
) {
  const proofValue = {
    draftId: input.draftId,
    application: input.application,
    sourceHash: input.sourceHash,
    model: input.model,
  };
  if (!verifyDocumentDraftProof(proofValue, input.proof)) {
    throw new InvalidDocumentDraftError();
  }
  const [portfolio, context] = await Promise.all([
    getCvContent(input.application.locale),
    getLatestAiContext(),
  ]);
  const sharedSource = {
    target: {
      company: input.application.company,
      role: input.application.role,
      sourceUrl: input.application.sourceUrl,
      jobDescription: input.application.jobDescription,
    },
    professionalContext: context?.professionalContext ?? "",
    portfolio,
  };
  const sourceHash = createSourceHash({
    ...sharedSource,
    personalContext: context?.personalContext ?? "",
  });
  if (sourceHash !== input.sourceHash) {
    throw new DocumentSourceConflictError();
  }
  const atsContent = atsGenerationSchema.parse(input.ats);
  const coverContent = coverLetterGenerationSchema.parse(input.cover);
  requireMatchingSlugs(
    portfolio.experience.map(({ slug }) => slug),
    atsContent.experience,
  );
  requireMatchingSlugs(
    portfolio.projects.map(({ slug }) => slug),
    atsContent.projects,
  );
  const canonicalSkills = new Map(
    portfolio.skillCategories.flatMap((category) =>
      category.skills.map((skill) => [skill.slug, skill.name] as const),
    ),
  );
  if (
    new Set(atsContent.skills).size !== atsContent.skills.length ||
    atsContent.skills.some((slug) => !canonicalSkills.has(slug))
  ) {
    throw new Error("Generated document contains unknown skills");
  }
  const experienceBullets = new Map(
    atsContent.experience.map(({ slug, bullets }) => [slug, bullets]),
  );
  const projectBullets = new Map(
    atsContent.projects.map(({ slug, bullets }) => [slug, bullets]),
  );
  const ats = atsArtifactSchema.parse({
    type: "ats_cv",
    locale: input.application.locale,
    name: portfolio.profile.fullName,
    headline: atsContent.headline,
    contact: [portfolio.profile.email, ...portfolio.profile.socialLinks.map(({ url }) => url)].filter(
      (value): value is string => Boolean(value),
    ),
    summary: atsContent.summary,
    skills: atsContent.skills.map((slug) => canonicalSkills.get(slug)),
    experience: portfolio.experience.map((item) => ({
      title: item.role,
      subtitle: item.company,
      period: formatDateRange(item.startDate, item.endDate, input.application.locale),
      bullets: experienceBullets.get(item.slug),
    })),
    education: portfolio.education.map((item) => ({
      title: item.degree,
      subtitle: item.institution,
      period: formatDateRange(item.startDate, item.endDate, input.application.locale),
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
    locale: input.application.locale,
    ...coverContent,
    name: portfolio.profile.fullName,
  });
  return createApplicationArtifacts({
    id: input.draftId,
    ...input.application,
    locale: databaseLocale[input.application.locale],
    sourceHash,
    model: input.model,
    atsTitle: `${input.application.role} · ${input.application.company} · ATS CV`,
    atsContent: ats as Prisma.InputJsonValue,
    coverTitle: `${input.application.role} · ${input.application.company} · Cover letter`,
    coverContent: cover as Prisma.InputJsonValue,
  });
}

export { DocumentKind };
