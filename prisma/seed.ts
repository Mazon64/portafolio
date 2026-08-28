import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  Locale,
  PrismaClient,
  SkillPresentation,
} from "../src/generated/prisma/client";

type Translation = {
  es: { name: string };
  en: { name: string };
};

type SeedSkill = Translation & {
  slug: string;
  iconKey?: string;
};

type SeedCategory = {
  slug: string;
  presentation: SkillPresentation;
  title: { es: string; en: string };
  description: { es: string; en: string };
  skills: SeedSkill[];
};

const skillCategories: SeedCategory[] = [
  {
    slug: "software-development",
    presentation: SkillPresentation.ICON_TILES,
    title: { es: "Desarrollo de Software", en: "Software Development" },
    description: {
      es: "Tecnologías para construir aplicaciones backend, web y móviles.",
      en: "Technologies for building backend, web, and mobile applications.",
    },
    skills: [
      { slug: "javascript", iconKey: "javascript", es: { name: "JavaScript" }, en: { name: "JavaScript" } },
      { slug: "nodejs", iconKey: "nodejs", es: { name: "Node.js" }, en: { name: "Node.js" } },
      { slug: "expressjs", iconKey: "expressjs", es: { name: "Express.js" }, en: { name: "Express.js" } },
      { slug: "mysql", iconKey: "mysql", es: { name: "MySQL" }, en: { name: "MySQL" } },
      { slug: "vuejs", iconKey: "vuejs", es: { name: "Vue.js" }, en: { name: "Vue.js" } },
      { slug: "react-native", iconKey: "react", es: { name: "React Native" }, en: { name: "React Native" } },
      { slug: "ionic", iconKey: "ionic", es: { name: "Ionic" }, en: { name: "Ionic" } },
    ],
  },
  {
    slug: "infrastructure-delivery",
    presentation: SkillPresentation.ICON_TILES,
    title: { es: "Infraestructura y Entrega", en: "Infrastructure & Delivery" },
    description: {
      es: "Herramientas para contenerización, automatización, colaboración y control de versiones.",
      en: "Tools for containerization, automation, collaboration, and version control.",
    },
    skills: [
      { slug: "docker", iconKey: "docker", es: { name: "Docker" }, en: { name: "Docker" } },
      { slug: "ci-cd", iconKey: "workflow", es: { name: "CI/CD" }, en: { name: "CI/CD" } },
      { slug: "git", iconKey: "git", es: { name: "Git" }, en: { name: "Git" } },
      { slug: "github", iconKey: "github", es: { name: "GitHub" }, en: { name: "GitHub" } },
    ],
  },
  {
    slug: "engineering-skills",
    presentation: SkillPresentation.BADGES,
    title: { es: "Habilidades de Ingeniería", en: "Engineering Skills" },
    description: {
      es: "Conceptos y prácticas aplicados al diseño, integración y evolución de sistemas.",
      en: "Concepts and practices applied to system design, integration, and evolution.",
    },
    skills: [
      { slug: "api-development", es: { name: "Desarrollo de APIs" }, en: { name: "API Development" } },
      { slug: "software-architecture", es: { name: "Arquitectura de software" }, en: { name: "Software Architecture" } },
      { slug: "single-sign-on", es: { name: "Inicio de sesión único (SSO)" }, en: { name: "Single Sign-On (SSO)" } },
      { slug: "large-language-models", es: { name: "Modelos de lenguaje grandes (LLMs)" }, en: { name: "Large Language Models (LLMs)" } },
      { slug: "prompt-engineering", es: { name: "Ingeniería de prompts" }, en: { name: "Prompt Engineering" } },
      { slug: "deterministic-llm-programming", es: { name: "Programación determinista con LLMs" }, en: { name: "Deterministic LLM Programming" } },
      { slug: "agile", es: { name: "Metodologías ágiles" }, en: { name: "Agile" } },
    ],
  },
];

const replacedSkillCategorySlugs = [
  "backend-data",
  "frontend-mobile",
  "devops-version-control",
  "architecture-engineering",
  "applied-ai",
];

function validateSkillCategories() {
  const categorySlugs = new Set<string>();
  const skillSlugs = new Set<string>();

  for (const category of skillCategories) {
    if (categorySlugs.has(category.slug)) {
      throw new Error(`Duplicate category slug: ${category.slug}`);
    }
    categorySlugs.add(category.slug);

    for (const skill of category.skills) {
      if (skillSlugs.has(skill.slug)) {
        throw new Error(`Duplicate skill slug: ${skill.slug}`);
      }
      if (category.presentation === SkillPresentation.ICON_TILES && !skill.iconKey) {
        throw new Error(`Missing icon key for skill: ${skill.slug}`);
      }
      if (category.presentation === SkillPresentation.BADGES && skill.iconKey) {
        throw new Error(`Unexpected icon key for badge: ${skill.slug}`);
      }
      skillSlugs.add(skill.slug);
    }
  }
}

function getConnectionString() {
  const connectionString = process.env.DIRECT_URL;
  if (!connectionString) {
    throw new Error("DIRECT_URL is required to seed the database.");
  }
  return connectionString;
}

async function main() {
  validateSkillCategories();

  const adapter = new PrismaPg({ connectionString: getConnectionString() });
  const prisma = new PrismaClient({ adapter });

  try {
    await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.upsert({
        where: { slug: "main-profile" },
        create: {
          slug: "main-profile",
          fullName: "David Yael Aranda Montes",
          email: "davidyaelam64@gmail.com",
          linkedinUrl: "https://www.linkedin.com/in/david-yael/",
          githubUrl: "https://github.com/Mazon64",
        },
        update: {
          fullName: "David Yael Aranda Montes",
          email: "davidyaelam64@gmail.com",
          linkedinUrl: "https://www.linkedin.com/in/david-yael/",
          githubUrl: "https://github.com/Mazon64",
        },
      });

      const profileTranslations = [
        {
          locale: Locale.ES,
          title: "Ingeniero de Software",
          longBio: "Ingeniero de Software especializado en desarrollo backend, arquitectura de sistemas e integración de inteligencia artificial. Experiencia construyendo aplicaciones empresariales y sistemas institucionales desde el diseño hasta su despliegue en producción.\n\nTrabajo con Node.js, bases de datos relacionales, APIs, Docker y arquitecturas modulares, con énfasis en mantenibilidad, seguridad y escalabilidad. He implementado sistemas de autenticación multi-tenant y federada, diseñado APIs seguras e integrado modelos de lenguaje (LLMs) en aplicaciones empresariales mediante prompt engineering, programación determinista de LLMs y arquitecturas de IA con contexto en tiempo real.",
          contactText: "¿Tienes una oportunidad, una colaboración o una idea por construir? Escríbeme y conversemos.",
        },
        {
          locale: Locale.EN,
          title: "Software Engineer",
          longBio: "Software Engineer specialized in backend development, system architecture, and artificial intelligence integration. Experienced in building enterprise and institutional applications from initial design to production deployment.\n\nI work with Node.js, relational databases, APIs, Docker, and modular architectures, with a strong focus on maintainability, security, and scalability. I have implemented multi-tenant and federated authentication systems, designed secure APIs, and integrated Large Language Models (LLMs) into enterprise applications using prompt engineering, deterministic LLM programming, and architectures that provide real-time contextual information.",
          contactText: "Have an opportunity, a collaboration, or an idea worth building? Send me a message and let's talk.",
        },
      ];

      for (const translation of profileTranslations) {
        await tx.profileTranslation.upsert({
          where: { profileId_locale: { profileId: profile.id, locale: translation.locale } },
          create: { profileId: profile.id, ...translation },
          update: translation,
        });
      }

      const experience = await tx.experience.upsert({
        where: { slug: "universidad-colima-backend-internship" },
        create: {
          slug: "universidad-colima-backend-internship",
          company: "Universidad de Colima",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-06-30T00:00:00.000Z"),
          showOnPortfolio: true,
          showOnCv: true,
          order: 0,
        },
        update: {
          company: "Universidad de Colima",
          startDate: new Date("2026-01-01T00:00:00.000Z"),
          endDate: new Date("2026-06-30T00:00:00.000Z"),
          showOnPortfolio: true,
          showOnCv: true,
          order: 0,
        },
      });

      const experienceTranslations = [
        {
          locale: Locale.ES,
          role: "Desarrollador backend (prácticas profesionales)",
          description: "Desarrollo y mantenimiento del backend de una plataforma institucional para gestionar flujos de trabajo en la Dirección General de Innovación y Emprendimiento de la Universidad de Colima. Implementación de APIs con Node.js y Express.js, integración de inicio de sesión único (SSO), persistencia relacional y preparación del entorno de ejecución con Docker.",
        },
        {
          locale: Locale.EN,
          role: "Backend Developer Intern",
          description: "Backend development and maintenance for an institutional workflow management platform at the General Directorate of Innovation and Entrepreneurship of the University of Colima. Implemented APIs with Node.js and Express.js, integrated Single Sign-On (SSO), worked with relational persistence, and prepared the runtime environment with Docker.",
        },
      ];

      for (const translation of experienceTranslations) {
        await tx.experienceTranslation.upsert({
          where: { experienceId_locale: { experienceId: experience.id, locale: translation.locale } },
          create: { experienceId: experience.id, ...translation },
          update: translation,
        });
      }

      const education = await tx.education.upsert({
        where: { slug: "universidad-colima-software-engineering" },
        create: {
          slug: "universidad-colima-software-engineering",
          institution: "Universidad de Colima",
          startDate: new Date("2022-08-01T00:00:00.000Z"),
          endDate: new Date("2026-07-31T00:00:00.000Z"),
          showOnPortfolio: true,
          showOnCv: true,
          order: 0,
        },
        update: {
          institution: "Universidad de Colima",
          startDate: new Date("2022-08-01T00:00:00.000Z"),
          endDate: new Date("2026-07-31T00:00:00.000Z"),
          showOnPortfolio: true,
          showOnCv: true,
          order: 0,
        },
      });

      const educationTranslations = [
        { locale: Locale.ES, degree: "Licenciatura en Ingeniería de Software" },
        { locale: Locale.EN, degree: "Bachelor's Degree in Software Engineering" },
      ];

      for (const translation of educationTranslations) {
        await tx.educationTranslation.upsert({
          where: { educationId_locale: { educationId: education.id, locale: translation.locale } },
          create: { educationId: education.id, ...translation },
          update: translation,
        });
      }

      for (const [categoryOrder, categoryData] of skillCategories.entries()) {
        const category = await tx.skillCategory.upsert({
          where: { slug: categoryData.slug },
          create: {
            slug: categoryData.slug,
            presentation: categoryData.presentation,
            showOnPortfolio: true,
            showOnCv: true,
            order: categoryOrder,
          },
          update: {
            presentation: categoryData.presentation,
            showOnPortfolio: true,
            showOnCv: true,
            order: categoryOrder,
          },
        });

        for (const locale of [Locale.ES, Locale.EN]) {
          const language = locale === Locale.ES ? "es" : "en";
          const translation = {
            locale,
            title: categoryData.title[language],
            description: categoryData.description[language],
          };
          await tx.skillCategoryTranslation.upsert({
            where: { categoryId_locale: { categoryId: category.id, locale } },
            create: { categoryId: category.id, ...translation },
            update: translation,
          });
        }

        for (const [skillOrder, skillData] of categoryData.skills.entries()) {
          const skill = await tx.skill.upsert({
            where: { slug: skillData.slug },
            create: {
              slug: skillData.slug,
              iconKey: skillData.iconKey,
              categoryId: category.id,
              showOnPortfolio: true,
              showOnCv: true,
              order: skillOrder,
            },
            update: {
              iconKey: skillData.iconKey,
              categoryId: category.id,
              showOnPortfolio: true,
              showOnCv: true,
              order: skillOrder,
            },
          });

          for (const locale of [Locale.ES, Locale.EN]) {
            const language = locale === Locale.ES ? "es" : "en";
            const translation = { locale, name: skillData[language].name };
            await tx.skillTranslation.upsert({
              where: { skillId_locale: { skillId: skill.id, locale } },
              create: { skillId: skill.id, ...translation },
              update: translation,
            });
          }
        }

        await tx.skill.deleteMany({
          where: {
            categoryId: category.id,
            slug: { notIn: categoryData.skills.map((skill) => skill.slug) },
          },
        });
      }

      await tx.skillCategory.deleteMany({
        where: { slug: { in: replacedSkillCategorySlugs } },
      });
    }, { timeout: 30_000 });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
