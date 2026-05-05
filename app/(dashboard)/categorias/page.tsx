import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { Tag } from "lucide-react";
import { CategoriasTable } from "./categorias-table";
import { CategoriaDialog } from "./categoria-dialog";
import { getAuthContext } from "@/lib/auth/require-rol";
import { ROLES } from "@/lib/constants";

interface CategoriaConBienes {
  id_caracteristica: number;
  codigo: string;
  descripcion: string;
  observaciones: string | null;
  created_at: string;
  bienes: { count: number }[] | null;
}

async function CategoriasContent({ canManage }: { canManage: boolean }) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("caracteristicas")
    .select(
      `
      id_caracteristica,
      codigo,
      descripcion,
      observaciones,
      created_at,
      bienes ( count )
    `,
    )
    .order("codigo", { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-destructive">
          Error al cargar las categorías: {error.message}
        </p>
      </div>
    );
  }

  const categorias = ((data ?? []) as CategoriaConBienes[]).map((c) => ({
    id_caracteristica: c.id_caracteristica,
    codigo: c.codigo,
    descripcion: c.descripcion,
    observaciones: c.observaciones,
    created_at: c.created_at,
    bienes_count: c.bienes?.[0]?.count ?? 0,
  }));

  return <CategoriasTable data={categorias} canManage={canManage} />;
}

function CategoriasLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b last:border-0"
          >
            <div className="h-6 w-16 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function CategoriasPage() {
  const ctx = await getAuthContext();
  const canManage = ctx.rol === ROLES.ADMINISTRADOR;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/50">
            <Tag className="h-5 w-5 text-amber-600 dark:text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Categorías</h1>
            <p className="text-muted-foreground text-sm">
              Tipos de bien con prefijos para los códigos automáticos
            </p>
          </div>
        </div>
        {canManage && <CategoriaDialog />}
      </div>

      <Suspense fallback={<CategoriasLoading />}>
        <CategoriasContent canManage={canManage} />
      </Suspense>
    </div>
  );
}
