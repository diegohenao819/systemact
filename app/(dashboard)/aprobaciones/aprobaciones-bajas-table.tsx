"use client";

import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
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
  aprobarSolicitudBaja,
  rechazarSolicitudBaja,
} from "./actions";
import { toast } from "sonner";

type Rel<T> = T | T[] | null;
type ProfileRel = { nombre: string; apellido: string };
type BienRel = { id_bien: number; codigo_generado: string; nombre: string };

interface SolicitudBajaRow {
  id_solicitud_baja: number;
  motivo: string;
  descripcion: string | null;
  estado: string;
  created_at: string;
  responsable_actual: string;
  solicitado_por: string;
  bienes: Rel<BienRel>;
  responsable_actual_rel: Rel<ProfileRel>;
  solicitado_por_rel: Rel<ProfileRel>;
}

interface AprobacionesBajasTableProps {
  data: SolicitudBajaRow[];
  currentUserId: string;
  isAdmin: boolean;
}

function unwrap<T>(value: Rel<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function profileName(profile: Rel<ProfileRel>) {
  const value = unwrap(profile);
  return value ? `${value.nombre} ${value.apellido}` : "—";
}

const estadoLabel: Record<string, string> = {
  PENDIENTE_RESPONSABLE: "Pendiente responsable",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
};

const estadoClass: Record<string, string> = {
  PENDIENTE_RESPONSABLE:
    "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-200",
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

export function AprobacionesBajasTable({
  data,
  currentUserId,
  isAdmin,
}: AprobacionesBajasTableProps) {
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
        row.descripcion,
        row.estado,
        profileName(row.responsable_actual_rel),
        profileName(row.solicitado_por_rel),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [data, search]);

  const approve = async (row: SolicitudBajaRow) => {
    setPendingId(row.id_solicitud_baja);
    const result = await aprobarSolicitudBaja(row.id_solicitud_baja);
    setPendingId(null);

    if (result.success) {
      toast.success("Baja aprobada");
    } else {
      toast.error(result.error ?? "No se pudo aprobar");
    }
  };

  const reject = async (row: SolicitudBajaRow) => {
    const motivo = window.prompt("Motivo de rechazo");
    if (!motivo) return;

    setPendingId(row.id_solicitud_baja);
    const result = await rechazarSolicitudBaja(row.id_solicitud_baja, motivo);
    setPendingId(null);

    if (result.success) {
      toast.success("Solicitud de baja rechazada");
    } else {
      toast.error(result.error ?? "No se pudo rechazar");
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por bien, motivo o responsable..."
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
              <TableHead>Solicitó</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((row) => {
                const bien = unwrap(row.bienes);
                const canApprove =
                  row.estado === "PENDIENTE_RESPONSABLE" &&
                  row.responsable_actual === currentUserId;
                const canReject =
                  canApprove ||
                  (isAdmin && row.estado === "PENDIENTE_RESPONSABLE");

                return (
                  <TableRow key={row.id_solicitud_baja}>
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
                    <TableCell className="align-top text-sm">
                      {profileName(row.solicitado_por_rel)}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {profileName(row.responsable_actual_rel)}
                    </TableCell>
                    <TableCell className="max-w-xs align-top text-sm">
                      <p className="font-medium">{row.motivo}</p>
                      {row.descripcion && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {row.descripcion}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex justify-end gap-2">
                        {canReject && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={pendingId === row.id_solicitud_baja}
                            onClick={() => reject(row)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        )}
                        {canApprove && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={pendingId === row.id_solicitud_baja}
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
                  No hay solicitudes de baja para mostrar.
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
