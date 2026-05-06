import { createBrowserClient } from "@supabase/ssr";

/**
 * Crea el cliente Supabase para componentes cliente.
 *
 * Úsalo solo cuando el navegador debe interactuar directamente con Supabase,
 * por ejemplo para subir imágenes al bucket `bienes`. Las lecturas iniciales
 * siguen prefiriendo Server Components.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
