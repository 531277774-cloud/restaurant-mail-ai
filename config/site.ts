import { SiteConfig } from "@/types/siteConfig";

export const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://restaurantmailai.com";

export const siteConfig: SiteConfig = {
  name: "Restaurant Mail AI",
  tagLine: "AI Email Copy Generator for Restaurants",
  description:
    "Restaurant Mail AI helps restaurant owners write on-brand customer emails in seconds with AI. Generate email subjects, preview text, body copy and HTML templates for your restaurant email marketing.",
  url: BASE_URL,
  authors: [
    {
      name: "Restaurant Mail AI",
      url: "https://restaurantmailai.com",
    },
  ],
  creator: "Restaurant Mail AI",
  socialLinks: {},
  themeColors: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
  defaultNextTheme: "system",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};
