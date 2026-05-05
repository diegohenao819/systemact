import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Geist } from "next/font/google";
import { Suspense } from "react";
import { Toaster } from "sonner";
import "./globals.css";

const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
).replace(/\/+$/, "");
const siteName = "SYSTEMACT";
const siteDescription =
  "Sistema interno de inventario para Conviventia: gestión de bienes, transferencias, bajas, reportes e historial.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  applicationName: siteName,
  title: {
    default: "SYSTEMACT | Inventario Conviventia",
    template: "%s | SYSTEMACT",
  },
  description: siteDescription,
  keywords: [
    "SYSTEMACT",
    "Conviventia",
    "inventario",
    "activos fijos",
    "bienes",
    "transferencias",
    "reportes",
  ],
  authors: [{ name: "Conviventia" }],
  creator: "Conviventia",
  publisher: "Conviventia",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/conviventia_logo_only.png", type: "image/png" },
      { url: "/conviventia_logo_only_resolution.png", type: "image/png" },
    ],
    apple: [{ url: "/conviventia_logo_only_resolution.png" }],
  },
  openGraph: {
    type: "website",
    locale: "es_CO",
    url: "/",
    siteName,
    title: "SYSTEMACT | Inventario Conviventia",
    description: siteDescription,
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "SYSTEMACT - Sistema de inventario Conviventia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SYSTEMACT | Inventario Conviventia",
    description: siteDescription,
    images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.className} antialiased`}>
        <Suspense fallback={null}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}
