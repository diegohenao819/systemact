"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/require-rol";
import { ROLES, type Rol } from "@/lib/constants";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Cambia el rol de un usuario desde el panel de administración.
 *
 * La protección contra dejar el sistema sin administradores activos está
 * duplicada: una validación temprana para la propia cuenta y el RPC
 * `actualizar_rol_usuario` como frontera de seguridad real.
 */
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

    if (id === ctx.userId && nuevoRol !== ROLES.ADMINISTRADOR) {
      return {
        success: false,
        error: "No puedes quitarte tu propio rol de administrador",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("actualizar_rol_usuario", {
      p_id: id,
      p_nuevo_rol: nuevoRol,
    });

    if (error) {
      console.error("Error al cambiar rol", error);
      return {
        success: false,
        error: "No se pudo cambiar el rol",
      };
    }

    revalidatePath("/usuarios");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al cambiar rol", error);
    return { success: false, error: "Error inesperado al cambiar rol" };
  }
}

/**
 * Activa o desactiva perfiles de usuario.
 *
 * El RPC `set_usuario_activo` vuelve a validar la regla del último administrador
 * activo para cubrir llamadas concurrentes o clientes modificados.
 */
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
      console.error("Error al cambiar estado de usuario", error);
      return {
        success: false,
        error: "No se pudo cambiar el estado del usuario",
      };
    }

    revalidatePath("/usuarios");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al cambiar estado de usuario", error);
    return { success: false, error: "Error inesperado" };
  }
}
