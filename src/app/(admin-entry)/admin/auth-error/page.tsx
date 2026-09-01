import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { detectLocale } from "@/i18n/config";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [requestHeaders, cookieStore, params] = await Promise.all([
    headers(),
    cookies(),
    searchParams,
  ]);
  const savedLocale = cookieStore.get("admin-locale")?.value;
  const locale =
    savedLocale === "es" || savedLocale === "en"
      ? savedLocale
      : detectLocale(requestHeaders.get("accept-language"));
  const error = params.error === "AccessDenied" ? "denied" : "failed";
  redirect(`/admin/${locale}/login?error=${error}`);
}
