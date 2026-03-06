import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { AreasTable } from "./areas-table";
import { AreaDialog } from "./area-dialog";

async function AreasContent() {
  const supabase = await createClient();

  const { data: areas, error } = await supabase
    .from("areas")
    .select("*")
    .order("nombre_area", { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-destructive">Error al cargar las áreas: {error.message}</p>
      </div>
    );
  }

  return <AreasTable data={areas ?? []} />;
}

function AreasLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
            <div className="h-4 w-8 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-6 w-16 bg-muted rounded-full animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AreasPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/50">
            <LayoutGrid className="h-5 w-5 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Áreas</h1>
            <p className="text-muted-foreground text-sm">
              Gestión de áreas organizacionales de Conviventia
            </p>
          </div>
        </div>
        <AreaDialog />
      </div>

      {/* Table */}
      <Suspense fallback={<AreasLoading />}>
        <AreasContent />
      </Suspense>
    </div>
  );
}
