import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { Building2 } from "lucide-react";
import { SedesTable } from "./sedes-table";
import { SedeDialog } from "./sede-dialog";

async function SedesContent() {
  const supabase = await createClient();

  const { data: sedes, error } = await supabase
    .from("sedes")
    .select("*")
    .order("nombre_sede", { ascending: true });

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-destructive">
          Error al cargar las sedes: {error.message}
        </p>
      </div>
    );
  }

  return <SedesTable data={sedes ?? []} />;
}

function SedesLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 bg-muted rounded animate-pulse" />
      <div className="rounded-lg border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b last:border-0"
          >
            <div className="h-4 w-8 bg-muted rounded animate-pulse" />
            <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            <div className="h-6 w-12 bg-muted rounded animate-pulse" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SedesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/50">
            <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sedes</h1>
            <p className="text-muted-foreground text-sm">
              Gestión de ubicaciones físicas de Conviventia
            </p>
          </div>
        </div>
        <SedeDialog />
      </div>

      {/* Table */}
      <Suspense fallback={<SedesLoading />}>
        <SedesContent />
      </Suspense>
    </div>
  );
}
