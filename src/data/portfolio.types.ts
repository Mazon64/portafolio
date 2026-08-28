export type SkillPresentationDto = "iconTiles" | "badges";

export type ProjectStatusDto =
  | "planned"
  | "inProgress"
  | "paused"
  | "completed"
  | "archived";

export interface PortfolioDto {
  profile: ProfileDto;
  experience: ExperienceDto[];
  education: EducationDto[];
  projects: ProjectDto[];
  skillCategories: SkillCategoryDto[];
}

export interface ProfileDto {
  fullName: string;
  email: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  title: string;
  longBio: string;
  contactText: string;
}

export interface ExperienceDto {
  slug: string;
  company: string;
  startDate: string;
  endDate: string | null;
  role: string;
  description: string;
}

export interface EducationDto {
  slug: string;
  institution: string;
  startDate: string;
  endDate: string | null;
  degree: string;
}

export interface ProjectDto {
  slug: string;
  demoUrl: string | null;
  repositoryUrl: string | null;
  techStack: string[];
  status: ProjectStatusDto;
  progressPct: number;
  lastTelemetryAt: string | null;
  name: string;
  summary: string;
  detailedInfo: string;
}

export interface SkillCategoryDto {
  slug: string;
  presentation: SkillPresentationDto;
  title: string;
  description: string;
  skills: SkillDto[];
}

export interface SkillDto {
  slug: string;
  iconKey: string | null;
  name: string;
}

type Translation<T> = readonly T[];

export interface RawPortfolioData {
  profile: {
    fullName: string;
    email: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    translations: Translation<{
      title: string;
      longBio: string;
      contactText: string;
    }>;
  } | null;
  experience: readonly {
    slug: string;
    company: string;
    startDate: Date;
    endDate: Date | null;
    translations: Translation<{ role: string; description: string }>;
  }[];
  education: readonly {
    slug: string;
    institution: string;
    startDate: Date;
    endDate: Date | null;
    translations: Translation<{ degree: string }>;
  }[];
  projects: readonly {
    slug: string;
    demoUrl: string | null;
    repositoryUrl: string | null;
    techStack: string[];
    status: "PLANNED" | "IN_PROGRESS" | "PAUSED" | "COMPLETED" | "ARCHIVED";
    progressPct: number;
    lastTelemetryAt: Date | null;
    translations: Translation<{
      name: string;
      summary: string;
      detailedInfo: string;
    }>;
  }[];
  skillCategories: readonly {
    slug: string;
    presentation: "ICON_TILES" | "BADGES";
    translations: Translation<{ title: string; description: string }>;
    skills: readonly {
      slug: string;
      iconKey: string | null;
      translations: Translation<{ name: string }>;
    }[];
  }[];
}
