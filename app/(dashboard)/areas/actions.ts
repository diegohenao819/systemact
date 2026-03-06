"use server";

import { createClient } from "@/lib/supabase/server";
import { createAreaSchema, updateAreaSchema } from "@/lib/validations/area";
import { revalidatePath } from "next/cache";

interface ActionResult {
  success: boolean;
  error?: string;
}

export async function crearArea(formData: FormData): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const raw = {
      nombre_area: formData.get("nombre_area"),
      estado: formData.get("estado") ?? "ACTIVO",
    };

    const parsed = createAreaSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return { success: false, error: firstError };
    }

    const { error } = await supabase.from("areas").insert(parsed.data);

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Ya existe un área con ese nombre" };
      }
      return { success: false, error: "Error al crear el área" };
    }

    revalidatePath("/areas");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al crear el área" };
  }
}

export async function actualizarArea(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const raw = {
      id_area: formData.get("id_area"),
      nombre_area: formData.get("nombre_area"),
      estado: formData.get("estado"),
    };

    const parsed = updateAreaSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return { success: false, error: firstError };
    }

    const { id_area, ...updateData } = parsed.data;

    const { error } = await supabase
      .from("areas")
      .update(updateData)
      .eq("id_area", id_area);

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Ya existe un área con ese nombre" };
      }
      return { success: false, error: "Error al actualizar el área" };
    }

    revalidatePath("/areas");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al actualizar" };
  }
}

export async function toggleEstadoArea(
  id_area: number,
  nuevoEstado: "ACTIVO" | "INACTIVO",
): Promise<ActionResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const { error } = await supabase
      .from("areas")
      .update({ estado: nuevoEstado })
      .eq("id_area", id_area);

    if (error) return { success: false, error: "Error al cambiar estado" };

    revalidatePath("/areas");
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado" };
  }
}
