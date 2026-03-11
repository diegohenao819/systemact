import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { BienesTable } from "./bienes-table";

async function BienesContent() {
  const supabase = await createClient();

  const { data: bienes, error } = await supabase
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
      responsable_texto,
      created_at,
      sedes ( nombre_sede ),
      areas ( nombre_area ),
      profiles:id_responsable ( nombre, apellido )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-destructive">
          Error al cargar los bienes: {error.message}
        </p>
      </div>
    );
  }

  return <BienesTable data={bienes ?? []} />;
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

export default function BienesPage() {
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
        <Button asChild>
          <Link href="/bienes/nuevo">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Bien
          </Link>
        </Button>
      </div>

      <Suspense fallback={<BienesLoading />}>
        <BienesContent />
      </Suspense>
    </div>
  );
}
