import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { BajaForm } from "../baja-form";
import { requireRol, ADMIN_ONLY } from "@/lib/auth/require-rol";

async function NuevaBajaContent({
  searchParams,
}: {
  searchParams: Promise<{ bien?: string }>;
}) {
  await requireRol(ADMIN_ONLY);
  const supabase = await createClient();

  const params = await searchParams;
  const bienIdParam = params.bien ? Number(params.bien) : null;

  const { data: bienes } = await supabase
    .from("bienes")
    .select(
      `
      id_bien,
      codigo_generado,
      nombre,
      cantidad,
      valor_unitario,
      valor_total,
      responsable_texto,
      sedes ( nombre_sede ),
      areas ( nombre_area ),
      profiles:id_responsable ( nombre, apellido )
      `,
    )
    .eq("estado", "ACTIVO")
    .order("codigo_generado");

  return (
    <BajaForm
      bienes={bienes ?? []}
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
