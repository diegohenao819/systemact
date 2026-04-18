import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { TransferenciaForm } from "../transferencia-form";

async function NuevaTransferenciaContent({
  searchParams,
}: {
  searchParams: Promise<{ bien?: string }>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const bienIdParam = params.bien ? Number(params.bien) : null;

  const [bienesRes, sedesRes, areasRes, perfilesRes] = await Promise.all([
    supabase
      .from("bienes")
      .select(
        `
        id_bien,
        codigo_generado,
        nombre,
        id_sede,
        id_area,
        id_responsable,
        responsable_texto,
        sedes ( nombre_sede ),
        areas ( nombre_area ),
        profiles:id_responsable ( nombre, apellido )
        `,
      )
      .eq("estado", "ACTIVO")
      .order("codigo_generado"),
    supabase
      .from("sedes")
      .select("id_sede, nombre_sede")
      .order("nombre_sede"),
    supabase
      .from("areas")
      .select("id_area, nombre_area")
      .eq("estado", "ACTIVO")
      .order("nombre_area"),
    supabase
      .from("profiles")
      .select("id, nombre, apellido")
      .eq("activo", true)
      .order("nombre"),
  ]);

  return (
    <TransferenciaForm
      bienes={bienesRes.data ?? []}
      sedes={sedesRes.data ?? []}
      areas={areasRes.data ?? []}
      responsables={perfilesRes.data ?? []}
      bienInicialId={bienIdParam && !Number.isNaN(bienIdParam) ? bienIdParam : null}
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

export default function NuevaTransferenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ bien?: string }>;
}) {
  return (
    <Suspense fallback={<FormLoading />}>
      <NuevaTransferenciaContent searchParams={searchParams} />
    </Suspense>
  );
}
