import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const locales = ['es', 'en'];

// Usando la nueva convención proxy
export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;
    
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.includes('.')
    ) {
        return;
    }

    const pathnameHasSupportedLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    if (pathnameHasSupportedLocale) return;

    const acceptLanguage = request.headers.get('accept-language') || '';
    const preferredLocale = acceptLanguage.toLowerCase().includes('es') ? 'es' : 'en';
    const pathStartsWithUnsupportedLocale = /^\/[a-z]{2}(\/|$)/i.test(pathname);

    let newPathname = pathname;
    if (pathStartsWithUnsupportedLocale) {
        newPathname = pathname.replace(/^\/[a-z]{2}/i, '') || '/';
    }

    request.nextUrl.pathname = `/${preferredLocale}${newPathname === '/' ? '' : newPathname}`;
    return NextResponse.redirect(request.nextUrl);
}

export const config = {
    matcher: ['/((?!_next|api|favicon.ico|.*\\..*).*)'],
};
