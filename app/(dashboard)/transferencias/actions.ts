"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createTransferenciaActionSchema } from "@/lib/validations/transferencia";

interface ActionResult {
  success: boolean;
  error?: string;
  id_transferencia?: number;
}

export async function crearTransferencia(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const raw = {
      id_bien: formData.get("id_bien"),
      sede_destino: formData.get("sede_destino"),
      area_destino: formData.get("area_destino"),
      responsable_destino: formData.get("responsable_destino"),
      responsable_destino_texto: formData.get("responsable_destino_texto"),
      motivo: formData.get("motivo"),
    };

    const parsed = createTransferenciaActionSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return { success: false, error: firstError };
    }

    const responsableDestino =
      parsed.data.responsable_destino && parsed.data.responsable_destino.length > 0
        ? parsed.data.responsable_destino
        : null;

    const responsableDestinoTexto =
      !responsableDestino &&
      parsed.data.responsable_destino_texto &&
      parsed.data.responsable_destino_texto.length > 0
        ? parsed.data.responsable_destino_texto
        : null;

    const { data, error } = await supabase.rpc("crear_transferencia", {
      p_id_bien: parsed.data.id_bien,
      p_sede_destino: parsed.data.sede_destino,
      p_area_destino: parsed.data.area_destino,
      p_responsable_destino: responsableDestino,
      p_responsable_destino_texto: responsableDestinoTexto,
      p_motivo: parsed.data.motivo,
      p_usuario_registro: user.id,
    });

    if (error) {
      return {
        success: false,
        error: error.message ?? "Error al registrar la transferencia",
      };
    }

    revalidatePath("/transferencias");
    revalidatePath("/bienes");
    revalidatePath("/inicio");
    return { success: true, id_transferencia: data as number };
  } catch (error) {
    console.error("Error inesperado al crear la transferencia", error);
    return {
      success: false,
      error: "Error inesperado al registrar la transferencia",
    };
  }
}
