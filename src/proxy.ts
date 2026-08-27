import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  defaultLocale,
  detectLocale,
  getPathLocale,
  hasLocale,
  isPublicRouteSegment,
  looksLikeLocale,
} from "./i18n/config";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pathLocale = getPathLocale(pathname);

  if (pathLocale && hasLocale(pathLocale)) return;

  const hasUnsupportedLocale =
    !isPublicRouteSegment(pathLocale) && looksLikeLocale(pathLocale);
  const locale = hasUnsupportedLocale
    ? defaultLocale
    : detectLocale(request.headers.get("accept-language"));
  const pathnameWithoutLocale = hasUnsupportedLocale && pathLocale
    ? pathname.slice(pathLocale.length + 1) || "/"
    : pathname;

  request.nextUrl.pathname = `/${locale}${
    pathnameWithoutLocale === "/" ? "" : pathnameWithoutLocale
  }`;

  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|.*\\..*).*)"],
};
