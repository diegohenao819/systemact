"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/require-rol";
import { ROLES, type Rol } from "@/lib/constants";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function cambiarRolUsuario(
  id: string,
  nuevoRol: Rol,
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (ctx.rol !== ROLES.ADMINISTRADOR) {
      return {
        success: false,
        error: "Solo administradores pueden cambiar roles",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("actualizar_rol_usuario", {
      p_id: id,
      p_nuevo_rol: nuevoRol,
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Error al cambiar el rol",
      };
    }

    revalidatePath("/usuarios");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al cambiar rol", error);
    return { success: false, error: "Error inesperado al cambiar rol" };
  }
}

export async function toggleUsuarioActivo(
  id: string,
  activo: boolean,
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (ctx.rol !== ROLES.ADMINISTRADOR) {
      return {
        success: false,
        error: "Solo administradores pueden activar/desactivar usuarios",
      };
    }

    if (id === ctx.userId && activo === false) {
      return {
        success: false,
        error: "No puedes desactivar tu propia cuenta",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("set_usuario_activo", {
      p_id: id,
      p_activo: activo,
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Error al cambiar el estado",
      };
    }

    revalidatePath("/usuarios");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al cambiar estado de usuario", error);
    return { success: false, error: "Error inesperado" };
  }
}
