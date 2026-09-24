import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Marcellus, Newsreader } from "next/font/google";
import { home } from "@/content/home";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

// Faces are self-hosted (design-system.md §1.1): next/font downloads them at
// build time and serves them from this origin. Every subset stays declared —
// Newsreader keeps latin-ext and Vietnamese because names and credits may be
// Vietnamese — but `subsets` names only what is preloaded. The browser fetches
// the others by unicode-range when a page uses them, instead of every visit
// preloading all eight files (3D-9).
const marcellus = Marcellus({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marcellus",
  display: "swap",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
  display: "swap",
});

// Canonical and Open Graph URLs resolve against the site's origin. The default
// description is the Home identity's lead, already public copy.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Nguyen Khanh Nhat",
    template: "%s — Nguyen Khanh Nhat",
  },
  description: home.identity.lead,
  openGraph: { type: "website", siteName: "Nguyen Khanh Nhat", locale: "en_US" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${marcellus.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
