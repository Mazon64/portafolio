import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { detectLocale } from "./i18n/config";

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    const configuredOrigin = process.env.NEXTAUTH_URL?.trim();
    if (configuredOrigin) {
      const canonicalUrl = new URL(configuredOrigin);
      if (request.nextUrl.origin !== canonicalUrl.origin) {
        canonicalUrl.pathname = request.nextUrl.pathname;
        canonicalUrl.search = request.nextUrl.search;
        return NextResponse.redirect(canonicalUrl);
      }
    }

    return NextResponse.next();
  }

  const locale = detectLocale(request.headers.get("accept-language"));
  request.nextUrl.pathname = `/${locale}`;

  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/", "/admin/:path*", "/api/auth/:path*"],
};
