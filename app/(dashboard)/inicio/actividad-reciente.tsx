import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeftRight,
  Clock,
  PackageMinus,
  PackagePlus,
  PenLine,
  type LucideIcon,
} from "lucide-react";

const iconos: Record<
  string,
  { Icon: LucideIcon; label: string; color: string }
> = {
  REGISTRO: {
    Icon: PackagePlus,
    label: "Registro",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  MODIFICACION: {
    Icon: PenLine,
    label: "Modificación",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  TRANSFERENCIA: {
    Icon: ArrowLeftRight,
    label: "Transferencia",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  BAJA: {
    Icon: PackageMinus,
    label: "Baja",
    color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
};

function formatoRelativo(iso: string): string {
  const fecha = new Date(iso);
  const diffMs = fecha.getTime() - Date.now();
  const diffMin = Math.round(diffMs / (1000 * 60));
  const diffH = Math.round(diffMin / 60);
  const diffDia = Math.round(diffH / 24);

  const rtf = new Intl.RelativeTimeFormat("es-CO", { numeric: "auto" });
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffH) < 24) return rtf.format(diffH, "hour");
  if (Math.abs(diffDia) < 30) return rtf.format(diffDia, "day");
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    fecha,
  );
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

interface Movimiento {
  id_movimiento: number;
  tipo_movimiento: string;
  detalle: string | null;
  created_at: string;
  bienes:
    | { codigo_generado: string }
    | { codigo_generado: string }[]
    | null;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

export async function ActividadReciente() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("movimiento_bienes")
    .select(
      `
      id_movimiento,
      tipo_movimiento,
      detalle,
      created_at,
      bienes ( codigo_generado ),
      profiles:usuario_responsable ( nombre, apellido )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return (
      <div className="rounded-xl border bg-card p-6">
        <h2 className="font-semibold">Actividad reciente</h2>
        <p className="mt-2 text-sm text-destructive">
          No se pudo cargar la actividad.
        </p>
      </div>
    );
  }

  const movimientos = (data ?? []) as Movimiento[];

  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h2 className="font-semibold">Actividad reciente</h2>
      </div>

      {movimientos.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Aún no hay movimientos registrados.
        </p>
      ) : (
        <ul className="space-y-4">
          {movimientos.map((mov) => {
            const config = iconos[mov.tipo_movimiento] ?? iconos.MODIFICACION;
            const { Icon, color } = config;
            const bien = unwrap(mov.bienes);
            const profile = unwrap(mov.profiles);
            const usuario = profile
              ? `${profile.nombre} ${profile.apellido}`.trim()
              : "Sistema";

            return (
              <li key={mov.id_movimiento} className="flex gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    {mov.detalle ?? config.label}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{usuario}</span>
                    {bien && (
                      <>
                        <span>·</span>
                        <span className="font-mono">
                          {bien.codigo_generado}
                        </span>
                      </>
                    )}
                    <span>·</span>
                    <span>{formatoRelativo(mov.created_at)}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ActividadRecienteLoading() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="h-5 w-40 bg-muted rounded animate-pulse mb-5" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-9 w-9 bg-muted rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
