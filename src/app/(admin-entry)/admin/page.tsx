import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { detectLocale } from "@/i18n/config";

export default async function AdminIndexPage() {
  const requestHeaders = await headers();
  const locale = detectLocale(requestHeaders.get("accept-language"));
  redirect(`/admin/${locale}`);
}
