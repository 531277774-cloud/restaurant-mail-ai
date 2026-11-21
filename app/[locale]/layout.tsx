import BaiDuAnalytics from "@/app/BaiDuAnalytics";
import FirstVisitTracker from "@/app/FirstVisitTracker";
import GoogleAdsense from "@/app/GoogleAdsense";
import GoogleAnalytics from "@/app/GoogleAnalytics";
import PlausibleAnalytics from "@/app/PlausibleAnalytics";
import Footer from "@/components/footer/Footer";
import Header from "@/components/header/Header";
import { LanguageDetectionAlert } from "@/components/LanguageDetectionAlert";
import { TailwindIndicator } from "@/components/TailwindIndicator";
import { siteConfig } from "@/config/site";
import { ORGANIZATION_JSON_LD } from "@/config/seo";
import { DEFAULT_LOCALE, Locale, routing } from "@/i18n/routing";
import { constructMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";
import "@/styles/globals.css";
import "@/styles/loading.css";
import { Analytics } from "@vercel/analytics/react";
import { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  // Hidden: getTranslations no longer used (meta is hardcoded in generateMetadata)
  // getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { notFound } from "next/navigation";

type MetadataProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: MetadataProps): Promise<Metadata> {
  const { locale } = await params;

  const base = await constructMetadata({
    page: "Home",
    title: "Restaurant Mail AI",
    description:
      "Restaurant Mail AI helps restaurant owners write on-brand customer emails in seconds. Generate promotions, win-back, event, and review emails with AI.",
    locale: locale as Locale,
    path: `/`,
    canonicalUrl: `/`,
  });

  const seoTitle =
    "Email Marketing for Restaurants | Restaurant Mail AI";
  const seoDescription =
    "Create high-converting restaurant marketing emails with AI. Generate email subjects, preview text, body copy and HTML templates for your restaurant email marketing.";

  return {
    ...base,
    title: seoTitle,
    description: seoDescription,
    openGraph: {
      ...(base.openGraph || {}),
      title: seoTitle,
      description: seoDescription,
      siteName: "Restaurant Mail AI",
    },
    twitter: {
      ...(base.twitter || {}),
      title: seoTitle,
      description: seoDescription,
    },
  };
}

export const viewport: Viewport = {
  themeColor: siteConfig.themeColors,
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale || DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        <script
          defer
          src="https://www.pvuv.ai/f.js"
          data-site="JL3Vp26o"
          data-api="https://in.pvuv.ai"
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background flex flex-col font-sans antialiased"
        )}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: ORGANIZATION_JSON_LD }}
        />
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme={siteConfig.defaultNextTheme}
            enableSystem
          >
            {messages.LanguageDetection && <LanguageDetectionAlert />}
            {messages.Header && <Header />}

            <main className="flex-1 flex flex-col items-center">
              {children}
            </main>

            {messages.Footer && <Footer />}
          </ThemeProvider>
        </NextIntlClientProvider>
        <FirstVisitTracker />
        <TailwindIndicator />
        <GoogleAnalytics />
        {process.env.NODE_ENV === "development" ? (
          <></>
        ) : (
          <>
            <Analytics />
            <BaiDuAnalytics />
            <GoogleAdsense />
            <PlausibleAnalytics />
          </>
        )}
      </body>
    </html>
  );
}
