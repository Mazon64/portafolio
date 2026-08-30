import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { getSiteUrl } from "@/config/env";
import { hasLocale, locales } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  const { metadata } = await getDictionary(lang);
  const siteUrl = getSiteUrl();

  return {
    ...metadata,
    ...(siteUrl && {
      metadataBase: siteUrl,
      alternates: {
        canonical: `/${lang}`,
        languages: {
          es: "/es",
          en: "/en",
          "x-default": "/",
        },
      },
    }),
  };
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!hasLocale(lang)) notFound();

  const { navigation, preferences } = await getDictionary(lang);
  const navigationItems = [
    { href: "#about", label: navigation.about },
    { href: "#skills", label: navigation.skills },
    { href: "#projects", label: navigation.projects },
    { href: "#experience", label: navigation.experience },
    { href: "#education", label: navigation.education },
    { href: "#contact", label: navigation.contact },
  ];

  return (
    <html
      lang={lang}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background text-foreground">
            <a
              href="#main-content"
              className="fixed top-3 left-3 z-50 -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {navigation.skipToContent}
            </a>
            <SiteHeader
              locale={lang}
              navigation={navigationItems}
              labels={{
                menu: navigation.menu,
                menuDescription: navigation.menuDescription,
                close: navigation.close,
                ...preferences,
              }}
            />
            {children}
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
