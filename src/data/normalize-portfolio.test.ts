import { describe, expect, it } from "vitest";
import {
  normalizePortfolio,
  PortfolioContentIntegrityError,
} from "./normalize-portfolio";
import type { RawPortfolioData } from "./portfolio.types";

function rawPortfolio(): RawPortfolioData {
  return {
    profile: {
      fullName: "Ada Lovelace",
      email: " ada@example.com ",
      socialLinks: [
        {
          slug: "linkedin",
          label: "LinkedIn",
          detail: "@ada",
          url: "http://linkedin.example/ada",
          iconKey: "linkedin",
        },
        {
          slug: "github",
          label: " GitHub ",
          detail: " @ada ",
          url: " https://github.com/ada ",
          iconKey: " github ",
        },
      ],
      translations: [
        { title: "Engineer", longBio: "Long", contactText: "Contact copy" },
      ],
    },
    experience: [
      {
        slug: "analytical-engine",
        company: "Babbage Labs",
        startDate: new Date("1842-01-01T00:00:00Z"),
        endDate: null,
        translations: [{ role: "Programmer", description: "Algorithms" }],
      },
    ],
    education: [
      {
        slug: "mathematics",
        institution: "Private study",
        startDate: new Date("1830-09-01T00:00:00Z"),
        endDate: new Date("1832-06-30T00:00:00Z"),
        translations: [{ degree: "Mathematics" }],
      },
    ],
    projects: [
      {
        slug: "notes",
        demoUrl: "javascript:alert(1)",
        repositoryUrl: "https://github.com/ada/notes",
        techStack: ["Mathematics"],
        status: "IN_PROGRESS",
        progressPct: 75,
        lastTelemetryAt: new Date("2026-08-27T12:34:56.789Z"),
        translations: [
          { name: "Notes", summary: "Summary", detailedInfo: "Details" },
        ],
      },
    ],
    skillCategories: [
      {
        slug: "technical",
        presentation: "ICON_TILES",
        translations: [{ title: "Technical", description: "Tools" }],
        skills: [
          {
            slug: "algorithms",
            iconKey: "code",
            translations: [{ name: "Algorithms" }],
          },
        ],
      },
    ],
  };
}

describe("normalizePortfolio", () => {
  it("flattens translations and serializes public values", () => {
    const result = normalizePortfolio(rawPortfolio());

    expect(result.profile).toEqual({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
      socialLinks: [
        {
          slug: "github",
          label: "GitHub",
          detail: "@ada",
          url: "https://github.com/ada",
          iconKey: "github",
        },
      ],
      title: "Engineer",
      longBio: "Long",
      contactText: "Contact copy",
    });
    expect(result.experience[0]).toMatchObject({
      startDate: "1842-01-01",
      endDate: null,
      role: "Programmer",
    });
    expect(result.education[0]).toMatchObject({
      startDate: "1830-09-01",
      endDate: "1832-06-30",
      degree: "Mathematics",
    });
    expect(result.projects[0]).toMatchObject({
      demoUrl: null,
      repositoryUrl: "https://github.com/ada/notes",
      status: "inProgress",
      progressPct: 75,
      lastTelemetryAt: "2026-08-27T12:34:56.789Z",
      name: "Notes",
    });
    expect(result.skillCategories[0]).toMatchObject({
      presentation: "iconTiles",
      title: "Technical",
      description: "Tools",
      skills: [{ slug: "algorithms", iconKey: "code", name: "Algorithms" }],
    });
  });

  it("normalizes invalid email and credentialed HTTPS URLs to null", () => {
    const raw = rawPortfolio();
    if (!raw.profile) throw new Error("Fixture profile is required.");
    raw.profile.email = "not-an-email";
    raw.profile.socialLinks[1].url =
      "https://user:secret@example.com/profile";

    const result = normalizePortfolio(raw);

    expect(result.profile.email).toBeNull();
    expect(result.profile.socialLinks).toEqual([]);
  });

  it("rejects email values containing URI parameters", () => {
    const raw = rawPortfolio();
    if (!raw.profile) throw new Error("Fixture profile is required.");
    raw.profile.email = "ada@example.com?subject=Injected";

    expect(normalizePortfolio(raw).profile.email).toBeNull();
  });

  it("throws a sanitized error when required content is missing", () => {
    const raw = rawPortfolio();
    raw.skillCategories[0].skills[0].translations = [];

    expect(() => normalizePortfolio(raw)).toThrowError(
      new PortfolioContentIntegrityError(),
    );
  });

  it("requires exactly one selected translation", () => {
    const raw = rawPortfolio();
    if (!raw.profile) throw new Error("Fixture profile is required.");
    raw.profile.translations = [
      ...raw.profile.translations,
      { title: "Duplicate", longBio: "Duplicate", contactText: "Duplicate" },
    ];

    expect(() => normalizePortfolio(raw)).toThrowError(
      "Portfolio content integrity check failed.",
    );
  });

  it.each([-1, 101, 10.5])("rejects invalid progress %s", (progressPct) => {
    const raw = rawPortfolio();
    raw.projects[0].progressPct = progressPct;

    expect(() => normalizePortfolio(raw)).toThrow(PortfolioContentIntegrityError);
  });
});
