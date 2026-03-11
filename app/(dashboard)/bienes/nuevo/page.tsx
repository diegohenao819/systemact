import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { BienForm } from "../bien-form";

async function NuevoBienContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Cargar datos para los dropdowns en paralelo
  const [sedesRes, areasRes, caractRes, perfilesRes] = await Promise.all([
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

  return (
    <BienForm
      sedes={sedesRes.data ?? []}
      areas={areasRes.data ?? []}
      caracteristicas={caractRes.data ?? []}
      responsables={perfilesRes.data ?? []}
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

export default function NuevoBienPage() {
  return (
    <Suspense fallback={<FormLoading />}>
      <NuevoBienContent />
    </Suspense>
  );
}
