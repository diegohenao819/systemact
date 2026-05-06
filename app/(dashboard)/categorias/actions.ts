"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/require-rol";
import { ROLES } from "@/lib/constants";
import {
  createCategoriaActionSchema,
  updateCategoriaActionSchema,
} from "@/lib/validations/categoria";

interface ActionResult {
  success: boolean;
  error?: string;
}

/**
 * Crea una categoría o tipo de bien.
 *
 * `codigo` es el prefijo usado por PostgreSQL para generar códigos automáticos
 * de inventario, por ejemplo `COMP-2026-001`.
 */
export async function crearCategoria(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (ctx.rol !== ROLES.ADMINISTRADOR) {
      return {
        success: false,
        error: "Solo administradores pueden gestionar categorías",
      };
    }

    const raw = {
      codigo: formData.get("codigo"),
      descripcion: formData.get("descripcion"),
      observaciones: formData.get("observaciones"),
    };

    const parsed = createCategoriaActionSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.from("caracteristicas").insert({
      codigo: parsed.data.codigo,
      descripcion: parsed.data.descripcion,
      observaciones: parsed.data.observaciones || null,
    });

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: "Ya existe una categoría con ese código",
        };
      }
      return { success: false, error: "Error al crear la categoría" };
    }

    revalidatePath("/categorias");
    revalidatePath("/bienes");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al crear categoría", error);
    return { success: false, error: "Error inesperado" };
  }
}

/**
 * Actualiza una categoría existente y revalida inventario porque el label del
 * tipo aparece en listados y formularios de bienes.
 */
export async function actualizarCategoria(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const ctx = await getAuthContext();
    if (ctx.rol !== ROLES.ADMINISTRADOR) {
      return {
        success: false,
        error: "Solo administradores pueden gestionar categorías",
      };
    }

    const raw = {
      id_caracteristica: formData.get("id_caracteristica"),
      codigo: formData.get("codigo"),
      descripcion: formData.get("descripcion"),
      observaciones: formData.get("observaciones"),
    };

    const parsed = updateCategoriaActionSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      };
    }

    const supabase = await createClient();
    const { id_caracteristica, ...updateData } = parsed.data;

    const { error } = await supabase
      .from("caracteristicas")
      .update({
        codigo: updateData.codigo,
        descripcion: updateData.descripcion,
        observaciones: updateData.observaciones || null,
      })
      .eq("id_caracteristica", id_caracteristica);

    if (error) {
      if (error.code === "23505") {
        return {
          success: false,
          error: "Ya existe una categoría con ese código",
        };
      }
      return { success: false, error: "Error al actualizar la categoría" };
    }

    revalidatePath("/categorias");
    revalidatePath("/bienes");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al actualizar categoría", error);
    return { success: false, error: "Error inesperado" };
  }
}
