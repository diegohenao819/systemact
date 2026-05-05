import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import {
  ArrowLeftRight,
  Clock,
  FileSpreadsheet,
  History,
  Package,
  PackageMinus,
  PackagePlus,
  PenLine,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BienSelector } from "./bien-selector";

interface BienDetalle {
  id_bien: number;
  codigo_generado: string;
  nombre: string;
  estado: string;
  cantidad: number;
  valor_unitario: number;
  valor_total: number;
  placa: string | null;
  serial: string | null;
  observaciones: string | null;
  responsable_texto: string | null;
  fecha_registro: string | null;
  sedes: { nombre_sede: string } | { nombre_sede: string }[] | null;
  areas: { nombre_area: string } | { nombre_area: string }[] | null;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

interface Movimiento {
  id_movimiento: number;
  tipo_movimiento: string;
  detalle: string | null;
  created_at: string;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

interface BajaInfo {
  motivo: string;
  descripcion: string | null;
  created_at: string;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

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

const estadoColors: Record<string, string> = {
  ACTIVO:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  INACTIVO:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "DE BAJA": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

async function HistorialContent({
  bienId,
}: {
  bienId: number | null;
}) {
  const supabase = await createClient();

  const { data: bienesLista } = await supabase
    .from("bienes")
    .select("id_bien, codigo_generado, nombre, estado")
    .order("codigo_generado");

  if (!bienId) {
    return (
      <div className="space-y-6">
        <BienSelector bienes={bienesLista ?? []} seleccionado={null} />
        <div className="rounded-xl border bg-card p-12 text-center">
          <History className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Selecciona un bien para ver su historial completo de movimientos.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: bien }, { data: movimientos }, { data: baja }] =
    await Promise.all([
      supabase
        .from("bienes")
        .select(
          `
          id_bien,
          codigo_generado,
          nombre,
          estado,
          cantidad,
          valor_unitario,
          valor_total,
          placa,
          serial,
          observaciones,
          responsable_texto,
          fecha_registro,
          sedes ( nombre_sede ),
          areas ( nombre_area ),
          profiles:id_responsable ( nombre, apellido )
        `,
        )
        .eq("id_bien", bienId)
        .maybeSingle(),
      supabase
        .from("movimiento_bienes")
        .select(
          `
          id_movimiento,
          tipo_movimiento,
          detalle,
          created_at,
          profiles:usuario_responsable ( nombre, apellido )
        `,
        )
        .eq("id_bien", bienId)
        .order("created_at", { ascending: true }),
      supabase
        .from("bajas")
        .select(
          `
          motivo,
          descripcion,
          created_at,
          profiles:usuario_registro ( nombre, apellido )
        `,
        )
        .eq("id_bien", bienId)
        .maybeSingle(),
    ]);

  if (!bien) {
    return (
      <div className="space-y-6">
        <BienSelector bienes={bienesLista ?? []} seleccionado={bienId} />
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Bien no encontrado.
        </div>
      </div>
    );
  }

  const bienData = bien as BienDetalle;
  const movs = (movimientos ?? []) as Movimiento[];
  const bajaData = baja as BajaInfo | null;
  const sede = unwrap(bienData.sedes)?.nombre_sede ?? "—";
  const area = unwrap(bienData.areas)?.nombre_area ?? "—";
  const profile = unwrap(bienData.profiles);
  const responsable = profile
    ? `${profile.nombre} ${profile.apellido}`
    : bienData.responsable_texto ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 print:hidden">
        <div className="flex-1">
          <BienSelector
            bienes={bienesLista ?? []}
            seleccionado={bienId}
          />
        </div>
        <Button variant="outline" asChild>
          <a href={`/api/export/historial?bien=${bienId}`}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar a Excel
          </a>
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-6 print:border-0">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Bien
            </p>
            <h2 className="mt-1 text-xl font-bold flex items-center gap-3">
              <span className="font-mono text-base">
                {bienData.codigo_generado}
              </span>
              {bienData.nombre}
            </h2>
            <Badge
              variant="outline"
              className={`mt-2 ${
                estadoColors[bienData.estado] ?? "bg-zinc-100"
              }`}
            >
              {bienData.estado}
            </Badge>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Sede
            </p>
            <p className="mt-0.5">{sede}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Área
            </p>
            <p className="mt-0.5">{area}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Responsable
            </p>
            <p className="mt-0.5">{responsable}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Cantidad
            </p>
            <p className="mt-0.5">{bienData.cantidad}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Valor unitario
            </p>
            <p className="mt-0.5">{formatCOP(bienData.valor_unitario)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Valor total
            </p>
            <p className="mt-0.5 font-semibold">
              {formatCOP(bienData.valor_total ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Placa
            </p>
            <p className="mt-0.5">{bienData.placa ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Serial
            </p>
            <p className="mt-0.5">{bienData.serial ?? "—"}</p>
          </div>
        </div>
      </div>

      {bajaData && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-6">
          <div className="flex items-start gap-3">
            <PackageMinus className="h-5 w-5 text-red-600 dark:text-red-400 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 dark:text-red-200">
                Bien dado de baja
              </h3>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-red-700/70 dark:text-red-300/70">
                    Motivo
                  </p>
                  <p className="mt-0.5 font-medium text-red-900 dark:text-red-200">
                    {bajaData.motivo}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-red-700/70 dark:text-red-300/70">
                    Fecha
                  </p>
                  <p className="mt-0.5 text-red-900 dark:text-red-200">
                    {formatFecha(bajaData.created_at)}
                  </p>
                </div>
                {bajaData.descripcion && (
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-wide text-red-700/70 dark:text-red-300/70">
                      Descripción
                    </p>
                    <p className="mt-0.5 text-red-900 dark:text-red-200">
                      {bajaData.descripcion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold">Historial de movimientos</h2>
          <span className="text-xs text-muted-foreground ml-auto">
            {movs.length} evento{movs.length !== 1 ? "s" : ""}
          </span>
        </div>

        {movs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No hay movimientos registrados para este bien.
          </p>
        ) : (
          <ol className="relative border-l border-border ml-3 space-y-6">
            {movs.map((mov, idx) => {
              const config = iconos[mov.tipo_movimiento] ?? iconos.MODIFICACION;
              const { Icon, color, label } = config;
              const u = unwrap(mov.profiles);
              const usuario = u
                ? `${u.nombre} ${u.apellido}`.trim()
                : "Sistema";
              const esUltimo = idx === movs.length - 1;

              return (
                <li key={mov.id_movimiento} className="ml-6">
                  <span
                    className={`absolute -left-4 flex h-8 w-8 items-center justify-center rounded-lg ring-4 ring-card ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className={esUltimo ? "" : "pb-2"}>
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-semibold text-sm">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatFecha(mov.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">
                      {mov.detalle ?? "Sin detalle"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Registrado por {usuario}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {bienData.observaciones && (
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Observaciones</h3>
          </div>
          <p className="text-sm whitespace-pre-wrap">{bienData.observaciones}</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center print:hidden">
        Para exportar a PDF, usa la opción de imprimir del navegador (Ctrl+P /
        Cmd+P) y elige &quot;Guardar como PDF&quot;.
      </p>
    </div>
  );
}

function HistorialLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-72 bg-muted rounded animate-pulse" />
      <div className="rounded-xl border bg-card p-6 space-y-3">
        <div className="h-6 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-muted rounded animate-pulse" />
          ))}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
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

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ bien?: string }>;
}) {
  const params = await searchParams;
  const raw = params.bien ? Number(params.bien) : null;
  const bienId = raw && !Number.isNaN(raw) ? raw : null;

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex items-center gap-3 print:hidden">
        <div className="rounded-lg bg-cyan-100 p-2 dark:bg-cyan-900/50">
          <History className="h-5 w-5 text-cyan-600 dark:text-cyan-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial</h1>
          <p className="text-muted-foreground text-sm">
            Trazabilidad completa de un bien: registro, modificaciones,
            transferencias y baja
          </p>
        </div>
      </div>

      <Suspense key={bienId ?? "vacio"} fallback={<HistorialLoading />}>
        <HistorialContent bienId={bienId} />
      </Suspense>

      <div className="hidden print:block text-xs text-muted-foreground text-center mt-8">
        Generado por SYSTEMACT · Conviventia ·{" "}
        {new Date().toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </div>
    </div>
  );
}
