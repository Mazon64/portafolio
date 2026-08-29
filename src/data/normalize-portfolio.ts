import type {
  PortfolioDto,
  ProjectStatusDto,
  RawPortfolioData,
  SkillPresentationDto,
} from "./portfolio.types";

const CONTENT_INTEGRITY_MESSAGE = "Portfolio content integrity check failed.";

export class PortfolioContentIntegrityError extends Error {
  constructor() {
    super(CONTENT_INTEGRITY_MESSAGE);
    this.name = "PortfolioContentIntegrityError";
  }
}

function requireTranslation<T>(translations: readonly T[]): T {
  if (translations.length !== 1) {
    throw new PortfolioContentIntegrityError();
  }

  return translations[0];
}

function toDateOnly(value: Date): string {
  if (Number.isNaN(value.getTime())) {
    throw new PortfolioContentIntegrityError();
  }

  const year = value.getUTCFullYear().toString().padStart(4, "0");
  const month = (value.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = value.getUTCDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function validHttpsUrl(value: string | null): string | null {
  if (value === null) return null;

  const candidate = value.trim();
  try {
    const url = new URL(candidate);
    if (
      url.protocol !== "https:" ||
      !url.hostname ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return candidate;
  } catch {
    return null;
  }
}

function validEmail(value: string | null): string | null {
  if (value === null) return null;

  const candidate = value.trim();
  return /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)+[A-Za-z]{2,63}$/.test(
    candidate,
  )
    ? candidate
    : null;
}

const projectStatuses: Record<
  RawPortfolioData["projects"][number]["status"],
  ProjectStatusDto
> = {
  PLANNED: "planned",
  IN_PROGRESS: "inProgress",
  PAUSED: "paused",
  COMPLETED: "completed",
  ARCHIVED: "archived",
};

const skillPresentations: Record<
  RawPortfolioData["skillCategories"][number]["presentation"],
  SkillPresentationDto
> = {
  ICON_TILES: "iconTiles",
  BADGES: "badges",
};

export function normalizePortfolio(raw: RawPortfolioData): PortfolioDto {
  if (!raw.profile) {
    throw new PortfolioContentIntegrityError();
  }

  const profileTranslation = requireTranslation(raw.profile.translations);

  return {
    profile: {
      fullName: raw.profile.fullName,
      email: validEmail(raw.profile.email),
      socialLinks: raw.profile.socialLinks.flatMap((link) => {
        const url = validHttpsUrl(link.url);
        const slug = link.slug.trim();
        const label = link.label.trim();
        if (!url || !slug || !label) return [];

        return [
          {
            slug,
            label,
            detail: link.detail?.trim() || null,
            url,
            iconKey: link.iconKey?.trim() || null,
          },
        ];
      }),
      ...profileTranslation,
    },
    experience: raw.experience.map((item) => ({
      slug: item.slug,
      company: item.company,
      startDate: toDateOnly(item.startDate),
      endDate: item.endDate ? toDateOnly(item.endDate) : null,
      ...requireTranslation(item.translations),
    })),
    education: raw.education.map((item) => ({
      slug: item.slug,
      institution: item.institution,
      startDate: toDateOnly(item.startDate),
      endDate: item.endDate ? toDateOnly(item.endDate) : null,
      ...requireTranslation(item.translations),
    })),
    projects: raw.projects.map((project) => {
      if (
        !Number.isInteger(project.progressPct) ||
        project.progressPct < 0 ||
        project.progressPct > 100 ||
        (project.lastTelemetryAt !== null &&
          Number.isNaN(project.lastTelemetryAt.getTime()))
      ) {
        throw new PortfolioContentIntegrityError();
      }

      return {
        slug: project.slug,
        demoUrl: validHttpsUrl(project.demoUrl),
        repositoryUrl: validHttpsUrl(project.repositoryUrl),
        techStack: [...project.techStack],
        status: projectStatuses[project.status],
        progressPct: project.progressPct,
        lastTelemetryAt: project.lastTelemetryAt?.toISOString() ?? null,
        ...requireTranslation(project.translations),
      };
    }),
    skillCategories: raw.skillCategories.map((category) => ({
      slug: category.slug,
      presentation: skillPresentations[category.presentation],
      ...requireTranslation(category.translations),
      skills: category.skills.map((skill) => ({
        slug: skill.slug,
        iconKey: skill.iconKey,
        ...requireTranslation(skill.translations),
      })),
    })),
  };
}
