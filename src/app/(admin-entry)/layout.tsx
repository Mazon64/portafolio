import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";

import { ThemeProvider } from "@/components/theme-provider";
import { detectLocale } from "@/i18n/config";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default async function AdminEntryLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = detectLocale(requestHeaders.get("accept-language"));

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
