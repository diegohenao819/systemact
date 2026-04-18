import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { ArrowLeftRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TransferenciasTable } from "./transferencias-table";

async function TransferenciasContent() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transferencias")
    .select(
      `
      id_transferencia,
      motivo,
      area_origen,
      area_destino,
      created_at,
      bienes ( id_bien, codigo_generado, nombre ),
      sede_origen_rel:sedes!transferencias_sede_origen_fkey ( nombre_sede ),
      sede_destino_rel:sedes!transferencias_sede_destino_fkey ( nombre_sede ),
      responsable_origen_rel:profiles!transferencias_responsable_origen_fkey ( nombre, apellido ),
      responsable_destino_rel:profiles!transferencias_responsable_destino_fkey ( nombre, apellido ),
      usuario_registro_rel:profiles!transferencias_usuario_registro_fkey ( nombre, apellido )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-destructive">
          Error al cargar las transferencias: {error.message}
        </p>
      </div>
    );
  }

  return <TransferenciasTable data={data ?? []} />;
}

function TransferenciasLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b last:border-0"
          >
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TransferenciasPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/50">
            <ArrowLeftRight className="h-5 w-5 text-amber-600 dark:text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transferencias</h1>
            <p className="text-muted-foreground text-sm">
              Movimientos de bienes entre sedes y áreas
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/transferencias/nueva">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Transferencia
          </Link>
        </Button>
      </div>

      <Suspense fallback={<TransferenciasLoading />}>
        <TransferenciasContent />
      </Suspense>
    </div>
  );
}
