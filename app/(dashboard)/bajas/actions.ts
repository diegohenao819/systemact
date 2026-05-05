"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/require-rol";
import { ROLES } from "@/lib/constants";
import { createBajaActionSchema } from "@/lib/validations/baja";

interface ActionResult {
  success: boolean;
  error?: string;
  id_baja?: number;
}

export async function crearBaja(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (ctx.rol !== ROLES.ADMINISTRADOR) {
      return {
        success: false,
        error: "Solo administradores pueden dar de baja un bien",
      };
    }

    const raw = {
      id_bien: formData.get("id_bien"),
      motivo: formData.get("motivo"),
      descripcion: formData.get("descripcion"),
    };

    const parsed = createBajaActionSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return { success: false, error: firstError };
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("crear_baja", {
      p_id_bien: parsed.data.id_bien,
      p_motivo: parsed.data.motivo,
      p_descripcion: parsed.data.descripcion || null,
      p_usuario_registro: ctx.userId,
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Error al registrar la baja",
      };
    }

    revalidatePath("/bajas");
    revalidatePath("/bienes");
    revalidatePath("/inicio");
    revalidatePath(`/bienes/${parsed.data.id_bien}`);
    return { success: true, id_baja: data as number };
  } catch (error) {
    console.error("Error inesperado al registrar la baja", error);
    return { success: false, error: "Error inesperado al registrar la baja" };
  }
}
