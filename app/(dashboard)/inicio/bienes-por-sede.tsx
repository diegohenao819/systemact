import { createClient } from "@/lib/supabase/server";
import { BarChart3 } from "lucide-react";
import { BienesPorSedeChart } from "./bienes-por-sede-chart";

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

interface BienConSede {
  id_sede: number | null;
  sedes:
    | { nombre_sede: string }
    | { nombre_sede: string }[]
    | null;
}

export async function BienesPorSede() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bienes")
    .select("id_sede, sedes ( nombre_sede )")
    .eq("estado", "ACTIVO");

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Bienes por sede</h2>
        <p className="mt-2 text-sm text-destructive">
          No se pudo cargar el gráfico.
        </p>
      </div>
    );
  }

  const counts = new Map<string, number>();
  for (const bien of (data ?? []) as BienConSede[]) {
    const sede = unwrap(bien.sedes)?.nombre_sede ?? "Sin sede";
    counts.set(sede, (counts.get(sede) ?? 0) + 1);
  }

  const chartData = Array.from(counts.entries())
    .map(([sede, total]) => ({ sede, total }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Bienes activos por sede</h2>
      </div>
      <BienesPorSedeChart data={chartData} />
    </div>
  );
}

export function BienesPorSedeLoading() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="h-5 w-48 bg-muted rounded animate-pulse mb-5" />
      <div className="h-60 bg-muted/50 rounded animate-pulse" />
    </div>
  );
}
