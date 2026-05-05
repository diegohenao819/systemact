import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { PackageMinus, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BajasTable } from "./bajas-table";
import { getAuthContext } from "@/lib/auth/require-rol";
import { ROLES } from "@/lib/constants";

async function BajasContent() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bajas")
    .select(
      `
      id_baja,
      motivo,
      descripcion,
      created_at,
      bienes ( id_bien, codigo_generado, nombre ),
      usuario_registro_rel:profiles!bajas_usuario_registro_fkey ( nombre, apellido )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-destructive">
          Error al cargar las bajas: {error.message}
        </p>
      </div>
    );
  }

  return <BajasTable data={data ?? []} />;
}

function BajasLoading() {
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
            <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function BajasPage() {
  const ctx = await getAuthContext();
  const canManage = ctx.rol === ROLES.ADMINISTRADOR;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900/50">
            <PackageMinus className="h-5 w-5 text-red-600 dark:text-red-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bajas</h1>
            <p className="text-muted-foreground text-sm">
              Historial de bienes retirados del inventario
            </p>
          </div>
        </div>
        {canManage && (
          <Button asChild>
            <Link href="/bajas/nueva">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Baja
            </Link>
          </Button>
        )}
      </div>

      <Suspense fallback={<BajasLoading />}>
        <BajasContent />
      </Suspense>
    </div>
  );
}
