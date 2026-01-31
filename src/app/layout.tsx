import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { PersonaProvider } from "@/components/persona-context";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "EuroLens - Your Voice in Brussels",
  description:
    "Understand EU legislation, take a stance, and make your voice heard. Contact MEPs, join consultations, and earn XP for civic engagement.",
  keywords: [
    "EU",
    "European Parliament",
    "legislation",
    "democracy",
    "civic engagement",
    "MEP",
    "consultations",
  ],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "EuroLens - Your Voice in Brussels",
    description:
      "Understand EU policy, take action, and make your voice heard. Contact MEPs, join consultations, and shape European democracy.",
    type: "website",
    locale: "en_US",
    siteName: "EuroLens",
  },
  twitter: {
    card: "summary_large_image",
    title: "EuroLens - Your Voice in Brussels",
    description:
      "Understand EU policy, take action, and make your voice heard. Contact MEPs, join consultations, and shape European democracy.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#003399" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <PersonaProvider>
          <Navbar />
          {children}
        </PersonaProvider>
      </body>
    </html>
  );
}
