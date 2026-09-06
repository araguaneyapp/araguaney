import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://araguaney-quiniela.vercel.app"),
  title: "Araguaney: Quiniela Mundial 2026",
  description: "Predice los partidos del Mundial y compite con tus amigos",
  openGraph: {
    title: "Araguaney: Quiniela Mundial 2026",
    description: "Predice los partidos del Mundial y compite con tus amigos",
    url: "https://araguaney-quiniela.vercel.app",
    siteName: "Araguaney",
    locale: "es_CL",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Araguaney: Quiniela Mundial 2026",
    description: "Predice los partidos del Mundial y compite con tus amigos",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`dark ${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}