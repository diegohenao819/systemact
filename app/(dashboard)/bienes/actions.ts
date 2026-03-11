"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createBienActionSchema, updateBienActionSchema } from "@/lib/validations/bien";

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

    // Obtener el prefijo del tipo de bien para generar código
    const { data: caract } = await supabase
      .from("caracteristicas")
      .select("codigo")
      .eq("id_caracteristica", parsed.data.id_caracteristica)
      .single();

    if (!caract) {
      return { success: false, error: "Tipo de bien no encontrado" };
    }

    // Generar código automático usando la función de PostgreSQL
    const { data: codigoData, error: codigoError } = await supabase.rpc(
      "generar_codigo_bien",
      { prefijo: caract.codigo }
    );

    if (codigoError || !codigoData) {
      return { success: false, error: "Error al generar el código del bien" };
    }

    // Insertar el bien
    const { data: nuevoBien, error: insertError } = await supabase
      .from("bienes")
      .insert({
        codigo_generado: codigoData,
        nombre: parsed.data.nombre,
        id_caracteristica: parsed.data.id_caracteristica,
        id_sede: parsed.data.id_sede,
        id_area: parsed.data.id_area,
        id_responsable: parsed.data.id_responsable,
        serial: parsed.data.serial || null,
        placa: parsed.data.placa || null,
        cantidad: parsed.data.cantidad,
        valor_unitario: parsed.data.valor_unitario,
        estado: parsed.data.estado,
        observaciones: parsed.data.observaciones || null,
      })
      .select("id_bien, codigo_generado")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        if (insertError.message.includes("placa")) {
          return { success: false, error: "Ya existe un bien con esa placa" };
        }
        return { success: false, error: "Ya existe un registro duplicado" };
      }
      return { success: false, error: "Error al crear el bien" };
    }

    // Registrar en auditoría
    await supabase.from("movimiento_bienes").insert({
      id_bien: nuevoBien.id_bien,
      tipo_movimiento: "REGISTRO",
      detalle: `Bien registrado: ${parsed.data.nombre} (${nuevoBien.codigo_generado})`,
      usuario_responsable: user.id,
    });

    revalidatePath("/bienes");
    revalidatePath("/inicio");
    return { success: true };
  } catch {
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

    const { error } = await supabase
      .from("bienes")
      .update({
        nombre: updateData.nombre,
        id_caracteristica: updateData.id_caracteristica,
        id_sede: updateData.id_sede,
        id_area: updateData.id_area,
        id_responsable: updateData.id_responsable,
        serial: updateData.serial || null,
        placa: updateData.placa || null,
        cantidad: updateData.cantidad,
        valor_unitario: updateData.valor_unitario,
        estado: updateData.estado,
        observaciones: updateData.observaciones || null,
      })
      .eq("id_bien", id_bien);

    if (error) {
      if (error.code === "23505") {
        if (error.message.includes("placa")) {
          return { success: false, error: "Ya existe un bien con esa placa" };
        }
        return { success: false, error: "Registro duplicado" };
      }
      return { success: false, error: "Error al actualizar el bien" };
    }

    // Registrar en auditoría
    await supabase.from("movimiento_bienes").insert({
      id_bien: id_bien,
      tipo_movimiento: "MODIFICACION",
      detalle: `Bien modificado: ${updateData.nombre}`,
      usuario_responsable: user.id,
    });

    revalidatePath("/bienes");
    revalidatePath("/inicio");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al actualizar" };
  }
}
