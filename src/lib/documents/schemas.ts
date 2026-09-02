import { z } from "zod";

const nullableHttpsUrl = z.union([z.null(), z.url().startsWith("https://")]);

const portfolioSchema = z.object({
  profile: z.object({
    fullName: z.string().min(1),
    email: z.string().nullable(),
    title: z.string().min(1),
    longBio: z.string().min(1),
    contactText: z.string(),
    socialLinks: z.array(
      z.object({
        slug: z.string().min(1),
        label: z.string().min(1),
        detail: z.string().nullable(),
        url: z.url().startsWith("https://"),
        iconKey: z.string().nullable(),
      }),
    ),
  }),
  experience: z.array(
    z.object({
      slug: z.string().min(1),
      company: z.string().min(1),
      startDate: z.iso.date(),
      endDate: z.iso.date().nullable(),
      role: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
  education: z.array(
    z.object({
      slug: z.string().min(1),
      institution: z.string().min(1),
      startDate: z.iso.date(),
      endDate: z.iso.date().nullable(),
      degree: z.string().min(1),
    }),
  ),
  projects: z.array(
    z.object({
      slug: z.string().min(1),
      demoUrl: nullableHttpsUrl,
      repositoryUrl: nullableHttpsUrl,
      techStack: z.array(z.string().min(1)),
      status: z.enum(["planned", "inProgress", "paused", "completed", "archived"]),
      progressPct: z.number().int().min(0).max(100),
      lastTelemetryAt: z.iso.datetime().nullable(),
      name: z.string().min(1),
      summary: z.string().min(1),
      detailedInfo: z.string(),
    }),
  ),
  skillCategories: z.array(
    z.object({
      slug: z.string().min(1),
      presentation: z.enum(["iconTiles", "badges"]),
      title: z.string().min(1),
      description: z.string(),
      skills: z.array(
        z.object({
          slug: z.string().min(1),
          iconKey: z.string().nullable(),
          name: z.string().min(1),
        }),
      ),
    }),
  ),
});

export const publicCvArtifactSchema = z.object({
  type: z.literal("public_cv"),
  portfolio: portfolioSchema,
});

export const publicCvGenerationSchema = z.object({
  summary: z.string().min(80).max(2_500),
  experience: z.array(
    z.object({ slug: z.string().min(1), description: z.string().min(40).max(3_000) }),
  ),
  projects: z.array(
    z.object({ slug: z.string().min(1), summary: z.string().min(30).max(1_500) }),
  ),
});

const atsEntrySchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  period: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1).max(8),
});

export const atsArtifactSchema = z.object({
  type: z.literal("ats_cv"),
  locale: z.enum(["es", "en"]),
  name: z.string().min(1),
  headline: z.string().min(1),
  contact: z.array(z.string().min(1)),
  summary: z.string().min(50),
  skills: z.array(z.string().min(1)).min(1),
  experience: z.array(atsEntrySchema),
  education: z.array(atsEntrySchema.omit({ bullets: true }).extend({ bullets: z.array(z.string()) })),
  projects: z.array(atsEntrySchema),
});

export const atsGenerationSchema = z.object({
  headline: z.string().min(1).max(200),
  summary: z.string().min(50).max(2_500),
  skills: z.array(z.string().min(1).max(100)).min(1).max(30),
  experience: z.array(
    z.object({
      slug: z.string().min(1),
      bullets: z.array(z.string().min(20).max(500)).min(1).max(8),
    }),
  ),
  projects: z.array(
    z.object({
      slug: z.string().min(1),
      bullets: z.array(z.string().min(20).max(500)).min(1).max(6),
    }),
  ),
});

export const coverLetterArtifactSchema = z.object({
  type: z.literal("cover_letter"),
  locale: z.enum(["es", "en"]),
  subject: z.string().min(1),
  salutation: z.string().min(1),
  paragraphs: z.array(z.string().min(40)).min(3).max(6),
  closing: z.string().min(1),
  name: z.string().min(1),
});

export const coverLetterGenerationSchema = coverLetterArtifactSchema.omit({
  type: true,
  locale: true,
  name: true,
});

export type PublicCvArtifact = z.infer<typeof publicCvArtifactSchema>;
export type PublicCvGeneration = z.infer<typeof publicCvGenerationSchema>;
export type AtsArtifact = z.infer<typeof atsArtifactSchema>;
export type AtsGeneration = z.infer<typeof atsGenerationSchema>;
export type CoverLetterArtifact = z.infer<typeof coverLetterArtifactSchema>;
