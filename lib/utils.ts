import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases condicionales y resuelve conflictos de Tailwind.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Obtiene la URL pública de la app para metadata y enlaces absolutos.
 *
 * En producción se prefiere `NEXT_PUBLIC_SITE_URL` o `NEXT_PUBLIC_APP_URL`.
 * Durante desarrollo cae a `window.location.origin` o localhost.
 */
export function getBaseUrl() {
  const configuredUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    const normalizedUrl = configuredUrl.replace(/\/+$/, "");
    return normalizedUrl.startsWith("http")
      ? normalizedUrl
      : `https://${normalizedUrl}`;
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

// Indica si el entorno tiene lo mínimo para crear clientes Supabase.
export const hasEnvVars =
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
