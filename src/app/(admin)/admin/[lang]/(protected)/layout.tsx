import { redirect } from "next/navigation";

import { AdminHeader } from "@/components/admin/admin-header";
import { adminCopy } from "@/i18n/admin";
import { hasLocale } from "@/i18n/config";
import { getAdminIdentity } from "@/lib/auth/authorization";

export default async function ProtectedAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const [{ lang }, identity] = await Promise.all([params, getAdminIdentity()]);
  if (!hasLocale(lang)) return null;
  if (!identity) redirect(`/admin/${lang}/login`);

  const copy = adminCopy[lang];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AdminHeader locale={lang} copy={copy} />
      <main
        id="admin-main"
        className="mx-auto w-full max-w-[96rem] px-5 py-16 sm:px-8 sm:py-24 lg:px-12"
      >
        {children}
      </main>
    </div>
  );
}
