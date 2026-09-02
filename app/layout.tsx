import type { Metadata } from "next";
import { Fraunces, Geist, IBM_Plex_Sans, Newsreader } from "next/font/google";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import "./globals.css";

const bodyFont = Geist({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const displayFont = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const landingBodyFont = IBM_Plex_Sans({
  variable: "--font-landing-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const landingDisplayFont = Newsreader({
  variable: "--font-landing-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Top Docs | Online specialist consultations",
  description:
    "Book an online consultation or second opinion with a specialist trained at AIIMS, PGIMER, Tata Memorial, JIPMER or CMC Vellore.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${landingBodyFont.variable} ${landingDisplayFont.variable}`}
      >
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
