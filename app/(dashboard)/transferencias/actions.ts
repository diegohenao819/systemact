"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthContext, WRITE_ROLES } from "@/lib/auth/require-rol";
import { createTransferenciaActionSchema } from "@/lib/validations/transferencia";

interface ActionResult {
  success: boolean;
  error?: string;
  tipo?: "transferencia" | "solicitud";
  id_transferencia?: number;
  id_solicitud_transferencia?: number;
}

/**
 * Registra una transferencia de ubicación/responsable.
 *
 * El RPC `crear_transferencia` ejecuta la parte crítica: bloquea el bien,
 * verifica que esté ACTIVO, evita transferir a la misma ubicación y escribe la
 * auditoría en una sola transacción.
 */
export async function crearTransferencia(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (!WRITE_ROLES.includes(ctx.rol)) {
      return {
        success: false,
        error: "No tienes permisos para registrar transferencias",
      };
    }

    const supabase = await createClient();

    const raw = {
      id_bien: formData.get("id_bien"),
      sede_destino: formData.get("sede_destino"),
      area_destino: formData.get("area_destino"),
      responsable_destino: formData.get("responsable_destino"),
      motivo: formData.get("motivo"),
    };

    const parsed = createTransferenciaActionSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return { success: false, error: firstError };
    }

    const { data: bienActual, error: bienError } = await supabase
      .from("bienes")
      .select("id_sede")
      .eq("id_bien", parsed.data.id_bien)
      .single();

    if (bienError || !bienActual) {
      return { success: false, error: "No se encontró el bien seleccionado" };
    }

    if (bienActual.id_sede !== parsed.data.sede_destino) {
      const { data, error } = await supabase.rpc(
        "crear_solicitud_transferencia",
        {
          p_id_bien: parsed.data.id_bien,
          p_sede_destino: parsed.data.sede_destino,
          p_area_destino: parsed.data.area_destino,
          p_responsable_destino: parsed.data.responsable_destino,
          p_motivo: parsed.data.motivo,
          p_usuario_solicitante: ctx.userId,
        },
      );

      if (error) {
        console.error("Error al crear solicitud de transferencia", error);
        return {
          success: false,
          error: "No se pudo crear la solicitud de transferencia",
        };
      }

      revalidatePath("/aprobaciones");
      revalidatePath("/bienes");
      revalidatePath("/inicio");
      return {
        success: true,
        tipo: "solicitud",
        id_solicitud_transferencia: data as number,
      };
    }

    const { data, error } = await supabase.rpc("crear_transferencia", {
      p_id_bien: parsed.data.id_bien,
      p_sede_destino: parsed.data.sede_destino,
      p_area_destino: parsed.data.area_destino,
      p_responsable_destino: parsed.data.responsable_destino,
      p_responsable_destino_texto: null,
      p_motivo: parsed.data.motivo,
      p_usuario_registro: ctx.userId,
    });

    if (error) {
      console.error("Error al crear transferencia", error);
      return {
        success: false,
        error: "No se pudo registrar la transferencia",
      };
    }

    revalidatePath("/transferencias");
    revalidatePath("/bienes");
    revalidatePath("/inicio");
    return {
      success: true,
      tipo: "transferencia",
      id_transferencia: data as number,
    };
  } catch (error) {
    console.error("Error inesperado al crear la transferencia", error);
    return {
      success: false,
      error: "Error inesperado al registrar la transferencia",
    };
  }
}
