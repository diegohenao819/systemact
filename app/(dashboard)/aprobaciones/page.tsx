import { Suspense } from "react";
import { ClipboardCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRol, WRITE_ROLES } from "@/lib/auth/require-rol";
import { ROLES } from "@/lib/constants";
import { AprobacionesTransferenciasTable } from "./aprobaciones-transferencias-table";
import { AprobacionesBajasTable } from "./aprobaciones-bajas-table";

type SolicitudesTransferenciaData = Parameters<
  typeof AprobacionesTransferenciasTable
>[0]["data"];
type SolicitudesBajaData = Parameters<typeof AprobacionesBajasTable>[0]["data"];

async function AprobacionesContent() {
  const ctx = await requireRol(WRITE_ROLES);
  const supabase = await createClient();
  const isAdmin = ctx.rol === ROLES.ADMINISTRADOR;

  let transferenciasQuery = supabase
    .from("solicitudes_transferencia")
    .select(
      `
      id_solicitud_transferencia,
      motivo,
      estado,
      created_at,
      responsable_origen,
      responsable_destino,
      solicitado_por,
      bienes ( id_bien, codigo_generado, nombre ),
      sede_origen_rel:sedes!solicitudes_transferencia_sede_origen_fkey ( nombre_sede ),
      sede_destino_rel:sedes!solicitudes_transferencia_sede_destino_fkey ( nombre_sede ),
      area_origen_rel:areas!solicitudes_transferencia_area_origen_fkey ( nombre_area ),
      area_destino_rel:areas!solicitudes_transferencia_area_destino_fkey ( nombre_area ),
      responsable_origen_rel:profiles!solicitudes_transferencia_responsable_origen_fkey ( nombre, apellido ),
      responsable_destino_rel:profiles!solicitudes_transferencia_responsable_destino_fkey ( nombre, apellido ),
      solicitado_por_rel:profiles!solicitudes_transferencia_solicitado_por_fkey ( nombre, apellido )
      `,
    )
    .order("created_at", { ascending: false });

  let bajasQuery = supabase
    .from("solicitudes_baja")
    .select(
      `
      id_solicitud_baja,
      motivo,
      descripcion,
      estado,
      created_at,
      responsable_actual,
      solicitado_por,
      bienes ( id_bien, codigo_generado, nombre ),
      responsable_actual_rel:profiles!solicitudes_baja_responsable_actual_fkey ( nombre, apellido ),
      solicitado_por_rel:profiles!solicitudes_baja_solicitado_por_fkey ( nombre, apellido )
      `,
    )
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    transferenciasQuery = transferenciasQuery.or(
      [
        `solicitado_por.eq.${ctx.userId}`,
        `responsable_origen.eq.${ctx.userId}`,
        `responsable_destino.eq.${ctx.userId}`,
      ].join(","),
    );
    bajasQuery = bajasQuery.or(
      [
        `solicitado_por.eq.${ctx.userId}`,
        `responsable_actual.eq.${ctx.userId}`,
      ].join(","),
    );
  }

  const [transferenciasRes, bajasRes] = await Promise.all([
    transferenciasQuery,
    bajasQuery,
  ]);

  if (transferenciasRes.error || bajasRes.error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-destructive">
          Error al cargar aprobaciones:{" "}
          {transferenciasRes.error?.message ?? bajasRes.error?.message}
        </p>
      </div>
    );
  }

  const transferenciasData = (transferenciasRes.data ??
    []) as SolicitudesTransferenciaData;
  const bajasData = (bajasRes.data ?? []) as SolicitudesBajaData;

  const transferencias = transferenciasData.filter((solicitud) => {
    if (isAdmin) return true;
    return (
      solicitud.solicitado_por === ctx.userId ||
      solicitud.responsable_origen === ctx.userId ||
      solicitud.responsable_destino === ctx.userId
    );
  });

  const bajas = bajasData.filter((solicitud) => {
    if (isAdmin) return true;
    return (
      solicitud.solicitado_por === ctx.userId ||
      solicitud.responsable_actual === ctx.userId
    );
  });

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Transferencias entre sedes</h2>
          <p className="text-sm text-muted-foreground">
            Aprueba entregas, recepciones o revisa solicitudes anteriores.
          </p>
        </div>
        <AprobacionesTransferenciasTable
          data={transferencias}
          currentUserId={ctx.userId}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Bajas solicitadas</h2>
          <p className="text-sm text-muted-foreground">
            El responsable actual aprueba o rechaza las bajas solicitadas por
            terceros.
          </p>
        </div>
        <AprobacionesBajasTable
          data={bajas}
          currentUserId={ctx.userId}
          isAdmin={isAdmin}
        />
      </section>
    </div>
  );
}

function AprobacionesLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b last:border-0"
          >
            <div className="h-5 w-28 bg-muted rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AprobacionesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/50">
          <ClipboardCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Aprobaciones</h1>
          <p className="text-muted-foreground text-sm">
            Solicitudes de transferencia entre sedes
          </p>
        </div>
      </div>

      <Suspense fallback={<AprobacionesLoading />}>
        <AprobacionesContent />
      </Suspense>
    </div>
  );
}
