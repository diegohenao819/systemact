import type { MetadataRoute } from "next";

const siteUrl = (
  process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
).replace(/\/+$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/auth/",
        "/areas",
        "/bajas",
        "/bienes",
        "/categorias",
        "/historial",
        "/inicio",
        "/reportes",
        "/sedes",
        "/transferencias",
        "/usuarios",
        "/protected",
        "/instruments",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
