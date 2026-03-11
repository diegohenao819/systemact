"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createBienActionSchema,
  updateBienActionSchema,
} from "@/lib/validations/bien";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function crearBien(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const raw = {
      nombre: formData.get("nombre"),
      id_caracteristica: formData.get("id_caracteristica"),
      id_sede: formData.get("id_sede"),
      id_area: formData.get("id_area"),
      id_responsable: formData.get("id_responsable"),
      responsable_texto: formData.get("responsable_texto"),
      serial: formData.get("serial"),
      placa: formData.get("placa"),
      cantidad: formData.get("cantidad"),
      valor_unitario: formData.get("valor_unitario"),
      estado: formData.get("estado"),
      observaciones: formData.get("observaciones"),
    };

    const parsed = createBienActionSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? "Datos inválidos";
      return { success: false, error: firstError };
    }

    const tieneResponsableId =
      parsed.data.id_responsable && parsed.data.id_responsable.length > 0;
    const tieneResponsableTexto =
      parsed.data.responsable_texto && parsed.data.responsable_texto.length > 0;

    const { error: createError } = await supabase.rpc(
      "crear_bien_con_auditoria",
      {
        p_nombre: parsed.data.nombre,
        p_id_caracteristica: parsed.data.id_caracteristica,
        p_id_sede: parsed.data.id_sede,
        p_id_area: parsed.data.id_area,
        p_id_responsable: tieneResponsableId ? parsed.data.id_responsable : null,
        p_responsable_texto: tieneResponsableTexto
          ? parsed.data.responsable_texto
          : null,
        p_serial: parsed.data.serial || null,
        p_placa: parsed.data.placa || null,
        p_cantidad: parsed.data.cantidad,
        p_valor_unitario: parsed.data.valor_unitario,
        p_estado: parsed.data.estado,
        p_observaciones: parsed.data.observaciones || null,
        p_usuario_responsable: user.id,
      },
    );

    if (createError) {
      if (createError.code === "23505") {
        if (createError.message.includes("placa")) {
          return { success: false, error: "Ya existe un bien con esa placa" };
        }
        return { success: false, error: "Ya existe un registro duplicado" };
      }
      return { success: false, error: "Error al crear el bien" };
    }

    revalidatePath("/bienes");
    revalidatePath("/inicio");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al crear el bien", error);
    return { success: false, error: "Error inesperado al crear el bien" };
  }
}

export async function actualizarBien(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const raw = {
      id_bien: formData.get("id_bien"),
      nombre: formData.get("nombre"),
      id_caracteristica: formData.get("id_caracteristica"),
      id_sede: formData.get("id_sede"),
      id_area: formData.get("id_area"),
      id_responsable: formData.get("id_responsable"),
      responsable_texto: formData.get("responsable_texto"),
      serial: formData.get("serial"),
      placa: formData.get("placa"),
      cantidad: formData.get("cantidad"),
      valor_unitario: formData.get("valor_unitario"),
      estado: formData.get("estado"),
      observaciones: formData.get("observaciones"),
    };

    const parsed = updateBienActionSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? "Datos inválidos";
      return { success: false, error: firstError };
    }

    const { id_bien, ...updateData } = parsed.data;

    const tieneResponsableId =
      updateData.id_responsable && updateData.id_responsable.length > 0;
    const tieneResponsableTexto =
      updateData.responsable_texto && updateData.responsable_texto.length > 0;

    const { error } = await supabase.rpc("actualizar_bien_con_auditoria", {
      p_id_bien: id_bien,
      p_nombre: updateData.nombre,
      p_id_caracteristica: updateData.id_caracteristica,
      p_id_sede: updateData.id_sede,
      p_id_area: updateData.id_area,
      p_id_responsable: tieneResponsableId ? updateData.id_responsable : null,
      p_responsable_texto: tieneResponsableTexto
        ? updateData.responsable_texto
        : null,
      p_serial: updateData.serial || null,
      p_placa: updateData.placa || null,
      p_cantidad: updateData.cantidad,
      p_valor_unitario: updateData.valor_unitario,
      p_estado: updateData.estado,
      p_observaciones: updateData.observaciones || null,
      p_usuario_responsable: user.id,
    });

    if (error) {
      if (error.code === "23505") {
        if (error.message.includes("placa")) {
          return { success: false, error: "Ya existe un bien con esa placa" };
        }
        return { success: false, error: "Registro duplicado" };
      }
      return { success: false, error: "Error al actualizar el bien" };
    }

    revalidatePath("/bienes");
    revalidatePath("/inicio");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al actualizar el bien", error);
    return { success: false, error: "Error inesperado al actualizar" };
  }
}
