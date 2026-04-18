import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Package,
  Building2,
  LayoutGrid,
  ArrowLeftRight,
  type LucideIcon,
} from "lucide-react";
import { Suspense } from "react";
import {
  ActividadReciente,
  ActividadRecienteLoading,
} from "./actividad-reciente";
import {
  BienesPorSede,
  BienesPorSedeLoading,
} from "./bienes-por-sede";

interface StatCard {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

async function StatsCards() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

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

  const cards: StatCard[] = [
    {
      label: "Bienes Activos",
      value: bienes.count ?? 0,
      icon: Package,
      color: "text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300",
    },
    {
      label: "Sedes",
      value: sedes.count ?? 0,
      icon: Building2,
      color: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    {
      label: "Áreas Activas",
      value: areas.count ?? 0,
      icon: LayoutGrid,
      color: "text-purple-600 bg-purple-100 dark:bg-purple-900/50 dark:text-purple-300",
    },
    {
      label: "Transferencias",
      value: transferencias.count ?? 0,
      icon: ArrowLeftRight,
      color: "text-amber-600 bg-amber-100 dark:bg-amber-900/50 dark:text-amber-300",
    },
  ];

  return (
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
  );
}

function StatsLoading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-8 w-8 bg-muted rounded-lg animate-pulse" />
          </div>
          <div className="mt-3">
            <div className="h-9 w-16 bg-muted rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InicioPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Panel de Control
        </h1>
        <p className="text-muted-foreground">
          Resumen general del inventario de recursos físicos
        </p>
      </div>

      <Suspense fallback={<StatsLoading />}>
        <StatsCards />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<BienesPorSedeLoading />}>
          <BienesPorSede />
        </Suspense>

        <Suspense fallback={<ActividadRecienteLoading />}>
          <ActividadReciente />
        </Suspense>
      </div>
    </div>
  );
}
