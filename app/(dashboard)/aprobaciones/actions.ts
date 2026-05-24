"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/require-rol";
import { createClient } from "@/lib/supabase/server";

interface ActionResult {
  success: boolean;
  error?: string;
}

function revalidateApprovalPaths() {
  revalidatePath("/aprobaciones");
  revalidatePath("/bienes");
  revalidatePath("/transferencias");
  revalidatePath("/inicio");
}

export async function cancelarSolicitudTransferencia(
  idSolicitud: number,
): Promise<ActionResult> {
  try {
    await getAuthContext();
    const supabase = await createClient();

    const { error } = await supabase.rpc("cancelar_solicitud_transferencia", {
      p_id_solicitud_transferencia: idSolicitud,
    });

    if (error) {
      console.error("Error al cancelar solicitud de transferencia", error);
      return { success: false, error: "No se pudo cancelar la solicitud" };
    }

    revalidateApprovalPaths();
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al cancelar solicitud", error);
    return { success: false, error: "Error inesperado al cancelar" };
  }
}

export async function aprobarRecepcionTransferencia(
  idSolicitud: number,
): Promise<ActionResult> {
  try {
    await getAuthContext();
    const supabase = await createClient();

    const { error } = await supabase.rpc("aprobar_recepcion_transferencia", {
      p_id_solicitud_transferencia: idSolicitud,
    });

    if (error) {
      console.error("Error al aprobar recepción de transferencia", error);
      return { success: false, error: "No se pudo aprobar la recepción" };
    }

    revalidateApprovalPaths();
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al aprobar recepción", error);
    return { success: false, error: "Error inesperado al aprobar" };
  }
}

export async function rechazarSolicitudTransferencia(
  idSolicitud: number,
  motivo: string,
): Promise<ActionResult> {
  try {
    await getAuthContext();
    const supabase = await createClient();

    const { error } = await supabase.rpc("rechazar_solicitud_transferencia", {
      p_id_solicitud_transferencia: idSolicitud,
      p_motivo_rechazo: motivo,
    });

    if (error) {
      console.error("Error al rechazar solicitud de transferencia", error);
      return { success: false, error: "No se pudo rechazar la solicitud" };
    }

    revalidateApprovalPaths();
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al rechazar solicitud", error);
    return { success: false, error: "Error inesperado al rechazar" };
  }
}

export async function aprobarSolicitudBaja(
  idSolicitud: number,
): Promise<ActionResult> {
  try {
    await getAuthContext();
    const supabase = await createClient();

    const { error } = await supabase.rpc("aprobar_solicitud_baja", {
      p_id_solicitud_baja: idSolicitud,
    });

    if (error) {
      console.error("Error al aprobar solicitud de baja", error);
      return { success: false, error: "No se pudo aprobar la baja" };
    }

    revalidateApprovalPaths();
    revalidatePath("/bajas");
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al aprobar baja", error);
    return { success: false, error: "Error inesperado al aprobar" };
  }
}

export async function rechazarSolicitudBaja(
  idSolicitud: number,
  motivo: string,
): Promise<ActionResult> {
  try {
    await getAuthContext();
    const supabase = await createClient();

    const { error } = await supabase.rpc("rechazar_solicitud_baja", {
      p_id_solicitud_baja: idSolicitud,
      p_motivo_rechazo: motivo,
    });

    if (error) {
      console.error("Error al rechazar solicitud de baja", error);
      return { success: false, error: "No se pudo rechazar la baja" };
    }

    revalidateApprovalPaths();
    return { success: true };
  } catch (error) {
    console.error("Error inesperado al rechazar baja", error);
    return { success: false, error: "Error inesperado al rechazar" };
  }
}
