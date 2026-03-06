import { BarChart3 } from "lucide-react";

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
        <p className="text-muted-foreground">Generación de reportes y estadísticas</p>
      </div>
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card p-16">
        <BarChart3 className="h-12 w-12 text-muted-foreground/40 mb-4" />
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
