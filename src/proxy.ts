import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { detectLocale } from "./i18n/config";

export function proxy(request: NextRequest) {
  const locale = detectLocale(request.headers.get("accept-language"));
  request.nextUrl.pathname = `/${locale}`;

  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/"],
};
