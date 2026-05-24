import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { BajaForm } from "../baja-form";
import { requireRol, WRITE_ROLES } from "@/lib/auth/require-rol";

interface BienPendiente {
  id_bien: number;
}

async function NuevaBajaContent({
  searchParams,
}: {
  searchParams: Promise<{ bien?: string }>;
}) {
  await requireRol(WRITE_ROLES);
  const supabase = await createClient();

  const params = await searchParams;
  const bienIdParam = params.bien ? Number(params.bien) : null;

  const [bienesRes, pendientesRes] = await Promise.all([
    supabase
      .from("bienes")
      .select(
        `
      id_bien,
      codigo_generado,
      nombre,
      cantidad,
      valor_unitario,
      valor_total,
      id_responsable,
      responsable_texto,
      sedes ( nombre_sede ),
      areas ( nombre_area ),
      profiles:id_responsable ( nombre, apellido )
      `,
      )
      .eq("estado", "ACTIVO")
      .order("codigo_generado"),
    supabase.rpc("listar_bienes_con_solicitud_pendiente"),
  ]);

  const bienesBloqueados = new Set(
    ((pendientesRes.data ?? []) as BienPendiente[]).map(
      (item) => item.id_bien,
    ),
  );

  const bienes = (bienesRes.data ?? []).filter(
    (bien) => bien.id_responsable && !bienesBloqueados.has(bien.id_bien),
  );

  return (
    <BajaForm
      bienes={bienes}
      bienInicialId={
        bienIdParam && !Number.isNaN(bienIdParam) ? bienIdParam : null
      }
    />
  );
}

function FormLoading() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function NuevaBajaPage({
  searchParams,
}: {
  searchParams: Promise<{ bien?: string }>;
}) {
  return (
    <Suspense fallback={<FormLoading />}>
      <NuevaBajaContent searchParams={searchParams} />
    </Suspense>
  );
}
