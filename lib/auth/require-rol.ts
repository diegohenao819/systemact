import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ROLES, type Rol } from "@/lib/constants";

export interface AuthContext {
  /** UUID del usuario autenticado en `auth.users` y `profiles`. */
  userId: string;
  /** Email principal de Supabase Auth. Puede venir vacío si el proveedor no lo entrega. */
  email: string;
  /** Rol de negocio usado para UI, Server Actions, RPCs y RLS. */
  rol: Rol;
  nombre: string;
  apellido: string;
  /** Los perfiles inactivos se tratan como no autenticados. */
  activo: boolean;
}

/**
 * Server-only: lee el perfil autenticado. Redirige a /auth/login si no hay
 * sesión o si el perfil está inactivo. Devuelve el contexto para usar en
 * server components y server actions.
 */
export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("rol, nombre, apellido, activo")
    .eq("id", user.id)
    .single();

  if (!profile || profile.activo === false) {
    redirect("/auth/login");
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    rol: profile.rol as Rol,
    nombre: profile.nombre,
    apellido: profile.apellido,
    activo: profile.activo ?? true,
  };
}

/**
 * Server-only: verifica que el rol del usuario esté en la lista permitida.
 * Si no, redirige a /inicio (o /auth/login si no hay sesión).
 */
export async function requireRol(roles: Rol[]): Promise<AuthContext> {
  const ctx = await getAuthContext();

  if (!roles.includes(ctx.rol)) {
    redirect("/inicio");
  }

  return ctx;
}

export const ADMIN_ONLY: Rol[] = [ROLES.ADMINISTRADOR];
export const WRITE_ROLES: Rol[] = [ROLES.ADMINISTRADOR, ROLES.ESTANDAR];
