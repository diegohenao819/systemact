import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { FileSpreadsheet, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BienesTable } from "./bienes-table";
import { getAuthContext } from "@/lib/auth/require-rol";
import { ROLES } from "@/lib/constants";

async function BienesContent({
  canWrite,
  canDarDeBaja,
}: {
  canWrite: boolean;
  canDarDeBaja: boolean;
}) {
  const supabase = await createClient();

  const [bienesRes, sedesRes, areasRes, caractRes] = await Promise.all([
    supabase
      .from("bienes")
      .select(
        `
        id_bien,
        codigo_generado,
        nombre,
        estado,
        cantidad,
        valor_unitario,
        valor_total,
        placa,
        serial,
        observaciones,
        imagen_url,
        responsable_texto,
        id_sede,
        id_area,
        id_caracteristica,
        created_at,
        sedes ( nombre_sede ),
        areas ( nombre_area ),
        caracteristicas ( codigo, descripcion ),
        profiles:id_responsable ( nombre, apellido )
      `,
      )
      .neq("estado", "DE BAJA")
      .order("created_at", { ascending: false }),
    supabase.from("sedes").select("id_sede, nombre_sede").order("nombre_sede"),
    supabase
      .from("areas")
      .select("id_area, nombre_area")
      .eq("estado", "ACTIVO")
      .order("nombre_area"),
    supabase
      .from("caracteristicas")
      .select("id_caracteristica, codigo, descripcion")
      .order("codigo"),
  ]);

  if (bienesRes.error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-destructive">
          Error al cargar los bienes: {bienesRes.error.message}
        </p>
      </div>
    );
  }

  return (
    <BienesTable
      data={bienesRes.data ?? []}
      sedes={sedesRes.data ?? []}
      areas={areasRes.data ?? []}
      caracteristicas={caractRes.data ?? []}
      canWrite={canWrite}
      canDarDeBaja={canDarDeBaja}
    />
  );
}

function BienesLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b last:border-0"
          >
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function BienesPage() {
  const ctx = await getAuthContext();
  const canWrite =
    ctx.rol === ROLES.ADMINISTRADOR || ctx.rol === ROLES.ESTANDAR;
  const canDarDeBaja = ctx.rol === ROLES.ADMINISTRADOR;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bienes</h1>
            <p className="text-muted-foreground text-sm">
              Gestión de activos físicos del inventario
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <a href="/api/export/bienes">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar
            </a>
          </Button>
          {canWrite && (
            <Button asChild>
              <Link href="/bienes/nuevo">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Bien
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Suspense fallback={<BienesLoading />}>
        <BienesContent canWrite={canWrite} canDarDeBaja={canDarDeBaja} />
      </Suspense>
    </div>
  );
}
