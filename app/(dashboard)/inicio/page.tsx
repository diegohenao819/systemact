import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Package,
  Building2,
  LayoutGrid,
  ArrowLeftRight,
} from "lucide-react";

async function getStats() {
  const supabase = await createClient();

  const [bienes, sedes, areas, transferencias] = await Promise.all([
    supabase
      .from("bienes")
      .select("id_bien", { count: "exact", head: true })
      .eq("estado", "ACTIVO"),
    supabase
      .from("sedes")
      .select("id_sede", { count: "exact", head: true }),
    supabase
      .from("areas")
      .select("id_area", { count: "exact", head: true })
      .eq("estado", "ACTIVO"),
    supabase
      .from("transferencias")
      .select("id_transferencia", { count: "exact", head: true }),
  ]);

  return {
    bienesActivos: bienes.count ?? 0,
    totalSedes: sedes.count ?? 0,
    totalAreas: areas.count ?? 0,
    totalTransferencias: transferencias.count ?? 0,
  };
}

export default async function InicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, rol")
    .eq("id", user.id)
    .single();

  const stats = await getStats();

  const cards = [
    {
      label: "Bienes Activos",
      value: stats.bienesActivos,
      icon: Package,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300",
    },
    {
      label: "Sedes",
      value: stats.totalSedes,
      icon: Building2,
      color:
        "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    {
      label: "Áreas Activas",
      value: stats.totalAreas,
      icon: LayoutGrid,
      color:
        "text-purple-600 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-300",
    },
    {
      label: "Transferencias",
      value: stats.totalTransferencias,
      icon: ArrowLeftRight,
      color:
        "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Panel de Control
        </h1>
        <p className="text-muted-foreground">
          Resumen general del inventario de recursos físicos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </p>
                <div className={`rounded-lg p-2 ${card.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-3xl font-bold">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Placeholder para contenido futuro */}
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Aquí se mostrarán gráficos y actividad reciente en fases posteriores.
        </p>
      </div>
    </div>
  );
}
