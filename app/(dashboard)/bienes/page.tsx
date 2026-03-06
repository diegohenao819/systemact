import { Package } from "lucide-react";

export default function BienesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bienes</h1>
        <p className="text-muted-foreground">Gestión de activos físicos del inventario</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16">
        <Package className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          Módulo en construcción
        </p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          Este módulo se implementará en las próximas fases.
        </p>
      </div>
    </div>
  );
}
