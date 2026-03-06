"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createSedeSchema, updateSedeSchema } from "@/lib/validations/sede";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function crearSede(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const raw = {
      nombre_sede: formData.get("nombre_sede"),
      abreviatura: formData.get("abreviatura"),
      ciudad: formData.get("ciudad"),
      direccion: formData.get("direccion"),
    };

    const parsed = createSedeSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Datos inválidos";
      return { success: false, error: firstError };
    }

    const { error } = await supabase
      .from("sedes")
      .insert(parsed.data);

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Ya existe una sede con ese nombre" };
      }
      return { success: false, error: "Error al crear la sede" };
    }

    revalidatePath("/sedes");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al crear la sede" };
  }
}

export async function actualizarSede(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const raw = {
      id_sede: formData.get("id_sede"),
      nombre_sede: formData.get("nombre_sede"),
      abreviatura: formData.get("abreviatura"),
      ciudad: formData.get("ciudad"),
      direccion: formData.get("direccion"),
    };

    const parsed = updateSedeSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message ?? "Datos inválidos";
      return { success: false, error: firstError };
    }

    const { id_sede, ...updateData } = parsed.data;

    const { error } = await supabase
      .from("sedes")
      .update(updateData)
      .eq("id_sede", id_sede);

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Ya existe una sede con ese nombre" };
      }
      return { success: false, error: "Error al actualizar la sede" };
    }

    revalidatePath("/sedes");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al actualizar" };
  }
}
