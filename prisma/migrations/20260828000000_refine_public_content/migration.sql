-- Add the editable contact message before removing obsolete public copy.
ALTER TABLE "ProfileTranslation" ADD COLUMN "contactText" TEXT;

UPDATE "ProfileTranslation"
SET "contactText" = CASE "locale"
    WHEN 'es' THEN '¿Tienes una oportunidad, una colaboración o una idea por construir? Escríbeme y conversemos.'
    ELSE 'Have an opportunity, a collaboration, or an idea worth building? Send me a message and let''s talk.'
END;

ALTER TABLE "ProfileTranslation" ALTER COLUMN "contactText" SET NOT NULL;
ALTER TABLE "ProfileTranslation" DROP COLUMN "shortBio";
ALTER TABLE "SkillCategoryTranslation" DROP COLUMN "description";
