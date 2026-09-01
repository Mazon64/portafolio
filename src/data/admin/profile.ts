import "server-only";

import { Locale } from "@/generated/prisma/client";
import { requireAdmin } from "@/lib/auth/authorization";
import { getPrisma } from "@/lib/prisma";

export type AdminProfile = {
  updatedAt: string;
  fullName: string;
  email: string;
  es: {
    title: string;
    longBio: string;
    contactText: string;
  };
  en: {
    title: string;
    longBio: string;
    contactText: string;
  };
};

export type AdminProfileInput = AdminProfile;

export async function getAdminProfile(): Promise<AdminProfile> {
  await requireAdmin();
  const profile = await getPrisma().profile.findUnique({
    where: { slug: "main-profile" },
    select: {
      fullName: true,
      email: true,
      updatedAt: true,
      translations: {
        select: {
          locale: true,
          title: true,
          longBio: true,
          contactText: true,
        },
      },
    },
  });

  const es = profile?.translations.find(({ locale }) => locale === Locale.ES);
  const en = profile?.translations.find(({ locale }) => locale === Locale.EN);

  if (!profile || !es || !en) {
    throw new Error("The main profile requires complete ES and EN translations.");
  }

  return {
    updatedAt: profile.updatedAt.toISOString(),
    fullName: profile.fullName,
    email: profile.email ?? "",
    es: {
      title: es.title,
      longBio: es.longBio,
      contactText: es.contactText,
    },
    en: {
      title: en.title,
      longBio: en.longBio,
      contactText: en.contactText,
    },
  };
}

export async function updateAdminProfile(input: AdminProfileInput): Promise<string | null> {
  await requireAdmin();
  const prisma = getPrisma();

  return prisma.$transaction(async (tx) => {
    const result = await tx.profile.updateMany({
      where: {
        slug: "main-profile",
        updatedAt: new Date(input.updatedAt),
      },
      data: {
        fullName: input.fullName,
        email: input.email || null,
      },
    });
    if (result.count !== 1) return null;

    const profile = await tx.profile.findUniqueOrThrow({
      where: { slug: "main-profile" },
      select: { id: true, updatedAt: true },
    });

    await Promise.all([
      tx.profileTranslation.upsert({
        where: {
          profileId_locale: { profileId: profile.id, locale: Locale.ES },
        },
        create: {
          profileId: profile.id,
          locale: Locale.ES,
          ...input.es,
        },
        update: input.es,
      }),
      tx.profileTranslation.upsert({
        where: {
          profileId_locale: { profileId: profile.id, locale: Locale.EN },
        },
        create: {
          profileId: profile.id,
          locale: Locale.EN,
          ...input.en,
        },
        update: input.en,
      }),
    ]);
    return profile.updatedAt.toISOString();
  });
}
