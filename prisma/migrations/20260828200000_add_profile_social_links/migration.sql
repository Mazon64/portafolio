-- Normalize social profiles so new networks can be added without schema changes.
CREATE TABLE "SocialLink" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "detail" TEXT,
    "url" TEXT NOT NULL,
    "iconKey" TEXT,
    "showOnPortfolio" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialLink_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SocialLink" ("profileId", "slug", "label", "detail", "url", "iconKey", "order")
SELECT
    "id",
    'linkedin',
    'LinkedIn',
    '@' || regexp_replace(trim(trailing '/' from "linkedinUrl"), '^.*/', ''),
    "linkedinUrl",
    'linkedin',
    0
FROM "Profile"
WHERE "linkedinUrl" IS NOT NULL;

INSERT INTO "SocialLink" ("profileId", "slug", "label", "detail", "url", "iconKey", "order")
SELECT
    "id",
    'github',
    'GitHub',
    '@' || regexp_replace(trim(trailing '/' from "githubUrl"), '^.*/', ''),
    "githubUrl",
    'github',
    1
FROM "Profile"
WHERE "githubUrl" IS NOT NULL;

CREATE UNIQUE INDEX "SocialLink_profileId_slug_key" ON "SocialLink"("profileId", "slug");
CREATE INDEX "SocialLink_profileId_showOnPortfolio_order_idx" ON "SocialLink"("profileId", "showOnPortfolio", "order");

ALTER TABLE "SocialLink"
ADD CONSTRAINT "SocialLink_profileId_fkey"
FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Profile" DROP COLUMN "linkedinUrl", DROP COLUMN "githubUrl";
