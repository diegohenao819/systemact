import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Suspense } from "react";
import { BienForm } from "../bien-form";

async function EditBienContent({ id }: { id: string }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [bienRes, sedesRes, areasRes, caractRes, perfilesRes] =
    await Promise.all([
      supabase
        .from("bienes")
        .select(
          "id_bien, nombre, id_caracteristica, id_sede, id_area, id_responsable, responsable_texto, serial, placa, cantidad, valor_unitario, estado, observaciones, codigo_generado, imagen_url"
        )
        .eq("id_bien", Number(id))
        .single(),
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
        .from("caracteristicas")
        .select("id_caracteristica, codigo, descripcion")
        .order("codigo"),
      supabase
        .from("profiles")
        .select("id, nombre, apellido, cedula")
        .eq("activo", true)
        .order("nombre"),
    ]);

  if (bienRes.error || !bienRes.data) {
    notFound();
  }

  return (
    <BienForm
      sedes={sedesRes.data ?? []}
      areas={areasRes.data ?? []}
      caracteristicas={caractRes.data ?? []}
      responsables={perfilesRes.data ?? []}
      bien={bienRes.data}
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
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function EditBienPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<FormLoading />}>
      <EditBienContent id={id} />
    </Suspense>
  );
}
