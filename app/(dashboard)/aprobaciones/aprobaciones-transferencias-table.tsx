"use client";

import { useMemo, useState } from "react";
import { Check, Clock, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  aprobarRecepcionTransferencia,
  cancelarSolicitudTransferencia,
  rechazarSolicitudTransferencia,
} from "./actions";
import { toast } from "sonner";

type Rel<T> = T | T[] | null;
type NameRel = { nombre_sede?: string; nombre_area?: string };
type ProfileRel = { nombre: string; apellido: string };
type BienRel = { id_bien: number; codigo_generado: string; nombre: string };

interface SolicitudTransferenciaRow {
  id_solicitud_transferencia: number;
  motivo: string;
  estado: string;
  created_at: string;
  responsable_origen: string;
  responsable_destino: string;
  solicitado_por: string;
  bienes: Rel<BienRel>;
  sede_origen_rel: Rel<NameRel>;
  sede_destino_rel: Rel<NameRel>;
  area_origen_rel: Rel<NameRel>;
  area_destino_rel: Rel<NameRel>;
  responsable_origen_rel: Rel<ProfileRel>;
  responsable_destino_rel: Rel<ProfileRel>;
  solicitado_por_rel: Rel<ProfileRel>;
}

interface AprobacionesTransferenciasTableProps {
  data: SolicitudTransferenciaRow[];
  currentUserId: string;
}

function unwrap<T>(value: Rel<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const estadoLabel: Record<string, string> = {
  PENDIENTE_ENTREGA: "Pendiente entrega",
  PENDIENTE_RECEPCION: "Pendiente aceptación",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

const estadoClass: Record<string, string> = {
  PENDIENTE_ENTREGA:
    "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
  PENDIENTE_RECEPCION:
    "border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-200",
  APROBADA:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200",
  RECHAZADA:
    "border-red-300 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200",
  CANCELADA:
    "border-gray-300 bg-gray-50 text-gray-700 dark:bg-gray-900 dark:text-gray-200",
};

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

function profileName(profile: Rel<ProfileRel>) {
  const value = unwrap(profile);
  return value ? `${value.nombre} ${value.apellido}` : "—";
}

export function AprobacionesTransferenciasTable({
  data,
  currentUserId,
}: AprobacionesTransferenciasTableProps) {
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      const bien = unwrap(row.bienes);
      const haystack = [
        bien?.codigo_generado,
        bien?.nombre,
        row.motivo,
        row.estado,
        profileName(row.responsable_origen_rel),
        profileName(row.responsable_destino_rel),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  const approve = async (row: SolicitudTransferenciaRow) => {
    setPendingId(row.id_solicitud_transferencia);
    const result = await aprobarRecepcionTransferencia(
      row.id_solicitud_transferencia,
    );
    setPendingId(null);

    if (result.success) {
      toast.success("Solicitud aprobada");
    } else {
      toast.error(result.error ?? "No se pudo aprobar");
    }
  };

  const cancel = async (row: SolicitudTransferenciaRow) => {
    setPendingId(row.id_solicitud_transferencia);
    const result = await cancelarSolicitudTransferencia(
      row.id_solicitud_transferencia,
    );
    setPendingId(null);

    if (result.success) {
      toast.success("Solicitud cancelada");
    } else {
      toast.error(result.error ?? "No se pudo cancelar");
    }
  };

  const reject = async (row: SolicitudTransferenciaRow) => {
    const motivo = window.prompt("Motivo de rechazo");
    if (!motivo) return;

    setPendingId(row.id_solicitud_transferencia);
    const result = await rechazarSolicitudTransferencia(
      row.id_solicitud_transferencia,
      motivo,
    );
    setPendingId(null);

    if (result.success) {
      toast.success("Solicitud rechazada");
    } else {
      toast.error(result.error ?? "No se pudo rechazar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por bien, responsable o motivo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitud</TableHead>
              <TableHead>Bien</TableHead>
              <TableHead>Origen</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((row) => {
                const bien = unwrap(row.bienes);
                const sedeOrigen = unwrap(row.sede_origen_rel);
                const sedeDestino = unwrap(row.sede_destino_rel);
                const areaOrigen = unwrap(row.area_origen_rel);
                const areaDestino = unwrap(row.area_destino_rel);
                const isPending = [
                  "PENDIENTE_ENTREGA",
                  "PENDIENTE_RECEPCION",
                ].includes(row.estado);
                const canCancel = isPending && row.solicitado_por === currentUserId;
                const canDecide =
                  row.estado === "PENDIENTE_RECEPCION" &&
                  row.responsable_destino === currentUserId &&
                  !canCancel;
                const showInProgress = isPending && !canCancel && !canDecide;

                return (
                  <TableRow key={row.id_solicitud_transferencia}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            estadoClass[row.estado] ?? ""
                          }`}
                        >
                          {estadoLabel[row.estado] ?? row.estado}
                        </Badge>
                        <p className="text-xs text-muted-foreground">
                          {formatFecha(row.created_at)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      {bien ? (
                        <div>
                          <p className="font-mono text-xs font-semibold">
                            {bien.codigo_generado}
                          </p>
                          <p className="text-sm">{bien.nombre}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="text-sm">
                        <p className="font-medium">
                          {sedeOrigen?.nombre_sede ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {areaOrigen?.nombre_area ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profileName(row.responsable_origen_rel)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="text-sm">
                        <p className="font-medium">
                          {sedeDestino?.nombre_sede ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {areaDestino?.nombre_area ?? "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profileName(row.responsable_destino_rel)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs align-top text-sm">
                      {row.motivo}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end gap-2">
                        {showInProgress && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Transferencia en proceso
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              pendingId === row.id_solicitud_transferencia
                            }
                            onClick={() => cancel(row)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Cancelar solicitud
                          </Button>
                        )}
                        {canDecide && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              pendingId === row.id_solicitud_transferencia
                            }
                            onClick={() => reject(row)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        )}
                        {canDecide && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              pendingId === row.id_solicitud_transferencia
                            }
                            onClick={() => approve(row)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No hay solicitudes de transferencia para mostrar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} solicitud(es)
      </p>
    </div>
  );
}
