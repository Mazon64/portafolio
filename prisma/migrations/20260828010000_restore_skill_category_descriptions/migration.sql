ALTER TABLE "SkillCategoryTranslation"
ADD COLUMN "description" TEXT NOT NULL DEFAULT '';

UPDATE "SkillCategoryTranslation" translation
SET "description" = CASE
    WHEN category.slug = 'software-development' AND translation.locale = 'es'
        THEN 'Tecnologías para construir aplicaciones backend, web y móviles.'
    WHEN category.slug = 'software-development'
        THEN 'Technologies for building backend, web, and mobile applications.'
    WHEN category.slug = 'infrastructure-delivery' AND translation.locale = 'es'
        THEN 'Herramientas para contenerización, automatización, colaboración y control de versiones.'
    WHEN category.slug = 'infrastructure-delivery'
        THEN 'Tools for containerization, automation, collaboration, and version control.'
    WHEN category.slug = 'engineering-skills' AND translation.locale = 'es'
        THEN 'Conceptos y prácticas aplicados al diseño, integración y evolución de sistemas.'
    WHEN category.slug = 'engineering-skills'
        THEN 'Concepts and practices applied to system design, integration, and evolution.'
    ELSE translation."description"
END
FROM "SkillCategory" category
WHERE category.id = translation."categoryId";

ALTER TABLE "SkillCategoryTranslation"
ALTER COLUMN "description" DROP DEFAULT;
