import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";
import { BarChart3, FileSpreadsheet, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PersonaSelector } from "./persona-selector";

interface BienAsignado {
  id_bien: number;
  codigo_generado: string;
  nombre: string;
  estado: string;
  cantidad: number;
  valor_unitario: number;
  valor_total: number;
  placa: string | null;
  serial: string | null;
  fecha_registro: string | null;
  sedes: { nombre_sede: string } | { nombre_sede: string }[] | null;
  areas: { nombre_area: string } | { nombre_area: string }[] | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

const estadoColors: Record<string, string> = {
  ACTIVO:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  INACTIVO:
    "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "DE BAJA": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

async function ReporteContent({
  personaId,
}: {
  personaId: string | null;
}) {
  const supabase = await createClient();

  const { data: personas } = await supabase
    .from("profiles")
    .select("id, nombre, apellido, cargo")
    .eq("activo", true)
    .order("nombre");

  if (!personaId) {
    return (
      <div className="space-y-6">
        <PersonaSelector personas={personas ?? []} seleccionada={null} />
        <div className="rounded-xl border bg-card p-12 text-center">
          <User className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">
            Selecciona una persona para ver su inventario asignado.
          </p>
        </div>
      </div>
    );
  }

  const [{ data: persona }, { data: bienes }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, nombre, apellido, cedula, cargo, area, id_sede, sedes ( nombre_sede )",
      )
      .eq("id", personaId)
      .maybeSingle(),
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
        fecha_registro,
        sedes ( nombre_sede ),
        areas ( nombre_area )
      `,
      )
      .eq("id_responsable", personaId)
      .neq("estado", "DE BAJA")
      .order("codigo_generado"),
  ]);

  const bienesData = (bienes ?? []) as BienAsignado[];
  const totalBienes = bienesData.reduce(
    (acc, b) => acc + (b.cantidad ?? 0),
    0,
  );
  const totalValor = bienesData.reduce(
    (acc, b) => acc + Number(b.valor_total ?? 0),
    0,
  );
  const sedePersona = unwrap(
    (persona?.sedes ?? null) as
      | { nombre_sede: string }
      | { nombre_sede: string }[]
      | null,
  )?.nombre_sede;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 print:hidden">
        <div className="flex-1">
          <PersonaSelector
            personas={personas ?? []}
            seleccionada={personaId}
          />
        </div>
        {persona && (
          <Button variant="outline" asChild>
            <a href={`/api/export/inventario-persona?persona=${personaId}`}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar a Excel
            </a>
          </Button>
        )}
      </div>

      {!persona ? (
        <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
          Persona no encontrada.
        </div>
      ) : (
        <>
          <div className="rounded-xl border bg-card p-6 print:border-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Reporte de inventario por persona
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {persona.nombre} {persona.apellido}
                </h2>
                <div className="mt-2 text-sm text-muted-foreground space-y-0.5">
                  {persona.cedula && <p>Cédula: {persona.cedula}</p>}
                  {persona.cargo && <p>Cargo: {persona.cargo}</p>}
                  {persona.area && <p>Área: {persona.area}</p>}
                  {sedePersona && <p>Sede: {sedePersona}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Bienes asignados
                  </p>
                  <p className="text-2xl font-bold">{bienesData.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Cantidad total
                  </p>
                  <p className="text-2xl font-bold">{totalBienes}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Sede</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Placa / Serial</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">V. unit.</TableHead>
                  <TableHead className="text-right">V. total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bienesData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Esta persona no tiene bienes asignados.
                    </TableCell>
                  </TableRow>
                ) : (
                  bienesData.map((b) => {
                    const sede = unwrap(b.sedes)?.nombre_sede ?? "—";
                    const area = unwrap(b.areas)?.nombre_area ?? "—";
                    const placaSerial = [b.placa, b.serial]
                      .filter(Boolean)
                      .join(" / ");
                    return (
                      <TableRow key={b.id_bien}>
                        <TableCell className="font-mono text-xs">
                          {b.codigo_generado}
                        </TableCell>
                        <TableCell className="font-medium">
                          {b.nombre}
                        </TableCell>
                        <TableCell className="text-sm">{sede}</TableCell>
                        <TableCell className="text-sm">{area}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {placaSerial || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              estadoColors[b.estado] ??
                              "bg-zinc-100 text-zinc-700"
                            }
                          >
                            {b.estado}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {b.cantidad}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatCOP(b.valor_unitario)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCOP(b.valor_total ?? 0)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
              {bienesData.length > 0 && (
                <tfoot>
                  <tr className="border-t bg-muted/40 font-semibold">
                    <td colSpan={6} className="px-4 py-3 text-sm">
                      Total
                    </td>
                    <td className="px-4 py-3 text-right">{totalBienes}</td>
                    <td className="px-4 py-3 text-right text-sm">—</td>
                    <td className="px-4 py-3 text-right">
                      {formatCOP(totalValor)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>

          <p className="text-xs text-muted-foreground text-center print:hidden">
            Para exportar a PDF, usa la opción de imprimir del navegador (Ctrl+P
            / Cmd+P) y elige &quot;Guardar como PDF&quot;.
          </p>
        </>
      )}
    </div>
  );
}

function ReporteLoading() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-72 bg-muted rounded animate-pulse" />
      <div className="rounded-xl border bg-card p-6">
        <div className="h-6 w-48 bg-muted rounded animate-pulse mb-3" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>
      <div className="rounded-xl border bg-card">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border-b last:border-0"
          >
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ persona?: string }>;
}) {
  const params = await searchParams;
  const personaId = params.persona ?? null;

  return (
    <div className="space-y-6 print:space-y-3">
      <div className="flex items-center gap-3 print:hidden">
        <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/50">
          <BarChart3 className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reportes</h1>
          <p className="text-muted-foreground text-sm">
            Inventario asignado por persona
          </p>
        </div>
      </div>

      <Suspense key={personaId ?? "vacio"} fallback={<ReporteLoading />}>
        <ReporteContent personaId={personaId} />
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
