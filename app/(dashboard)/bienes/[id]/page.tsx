import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BienForm } from "../bien-form";
import { requireRol, WRITE_ROLES } from "@/lib/auth/require-rol";
import { Button } from "@/components/ui/button";
import { LockKeyhole } from "lucide-react";
import Link from "next/link";

async function EditBienContent({ id }: { id: string }) {
  await requireRol(WRITE_ROLES);
  const supabase = await createClient();

  const [bienRes, sedesRes, areasRes, caractRes, perfilesRes, pendienteRes] =
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
      supabase.rpc("bien_tiene_solicitud_pendiente", {
        p_id_bien: Number(id),
      }),
    ]);

  if (bienRes.error || !bienRes.data) {
    notFound();
  }

  if (pendienteRes.data === true) {
    return (
      <div className="max-w-2xl rounded-lg border bg-card p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-amber-100 p-2 text-amber-700 dark:bg-amber-950 dark:text-amber-200">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div className="space-y-3">
            <div>
              <h1 className="text-xl font-semibold">Bien bloqueado</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Este bien tiene una solicitud pendiente. No se puede editar
                hasta que la solicitud sea aprobada o rechazada.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link href="/aprobaciones">Ver aprobaciones</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/bienes">Volver a bienes</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
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
