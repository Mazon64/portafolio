import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";
import { getAdminProfile } from "@/data/admin/profile";
import { ProfileForm } from "./profile-form";

export default async function AdminProfilePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!hasLocale(lang)) return null;

  const [profile] = await Promise.all([getAdminProfile()]);
  const copy = adminCopy[lang].profile;

  return (
    <div>
      <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">{copy.eyebrow}</p>
      <h1 className="mt-4 max-w-3xl text-5xl leading-none font-semibold tracking-[-0.05em] sm:text-7xl">
        {copy.title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
        {copy.description}
      </p>
      <ProfileForm profile={profile} locale={lang} copy={copy} />
    </div>
  );
}
