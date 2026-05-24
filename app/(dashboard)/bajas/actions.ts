"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthContext, WRITE_ROLES } from "@/lib/auth/require-rol";
import { createBajaActionSchema } from "@/lib/validations/baja";

interface ActionResult {
  success: boolean;
  error?: string;
  tipo?: "baja" | "solicitud";
  id_baja?: number;
  id_solicitud_baja?: number;
}

/**
 * Registra una baja o crea solicitud según el responsable actual.
 *
 * Si el usuario autenticado es el responsable del bien, la baja se ejecuta de
 * inmediato. Si no, queda como solicitud pendiente para que el responsable la
 * apruebe o rechace.
 */
export async function crearBaja(formData: FormData): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!WRITE_ROLES.includes(ctx.rol)) {
      return {
        success: false,
        error: "No tienes permisos para solicitar bajas",
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
    const { data: bienActual, error: bienError } = await supabase
      .from("bienes")
      .select("id_responsable")
      .eq("id_bien", parsed.data.id_bien)
      .single();

    if (bienError || !bienActual) {
      return { success: false, error: "No se encontró el bien seleccionado" };
    }

    if (bienActual.id_responsable !== ctx.userId) {
      const { data, error } = await supabase.rpc("crear_solicitud_baja", {
        p_id_bien: parsed.data.id_bien,
        p_motivo: parsed.data.motivo,
        p_descripcion: parsed.data.descripcion || null,
        p_usuario_solicitante: ctx.userId,
      });

      if (error) {
        console.error("Error al crear solicitud de baja", error);
        return {
          success: false,
          error: "No se pudo crear la solicitud de baja",
        };
      }

      revalidatePath("/aprobaciones");
      revalidatePath("/bienes");
      revalidatePath("/inicio");
      revalidatePath(`/bienes/${parsed.data.id_bien}`);
      return {
        success: true,
        tipo: "solicitud",
        id_solicitud_baja: data as number,
      };
    }

    const { data, error } = await supabase.rpc("crear_baja", {
      p_id_bien: parsed.data.id_bien,
      p_motivo: parsed.data.motivo,
      p_descripcion: parsed.data.descripcion || null,
      p_usuario_registro: ctx.userId,
    });

    if (error) {
      console.error("Error al crear baja", error);
      return {
        success: false,
        error: "No se pudo registrar la baja",
      };
    }

    revalidatePath("/bajas");
    revalidatePath("/bienes");
    revalidatePath("/inicio");
    revalidatePath(`/bienes/${parsed.data.id_bien}`);
    return { success: true, tipo: "baja", id_baja: data as number };
  } catch (error) {
    console.error("Error inesperado al registrar la baja", error);
    return { success: false, error: "Error inesperado al registrar la baja" };
  }
}
