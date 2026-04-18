"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageOff, PenLine } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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
  imagen_url: string | null;
  responsable_texto: string | null;
  created_at: string;
  sedes: { nombre_sede: string } | { nombre_sede: string }[] | null;
  areas: { nombre_area: string } | { nombre_area: string }[] | null;
  profiles:
    | { nombre: string; apellido: string }
    | { nombre: string; apellido: string }[]
    | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

interface BienDetailDialogProps {
  bien: BienDetalle | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatCOP = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value);

const formatFecha = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
  }).format(new Date(iso));

const estadoColors: Record<string, string> = {
  ACTIVO:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  INACTIVO: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "DE BAJA": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function Campo({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function BienDetailDialog({
  bien,
  open,
  onOpenChange,
}: BienDetailDialogProps) {
  if (!bien) return null;

  const profile = unwrap(bien.profiles);
  const sede = unwrap(bien.sedes);
  const area = unwrap(bien.areas);
  const responsable = profile
    ? `${profile.nombre} ${profile.apellido}`
    : bien.responsable_texto;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{bien.nombre}</DialogTitle>
          <DialogDescription>
            <span className="font-mono font-semibold">
              {bien.codigo_generado}
            </span>
            <span className="mx-2">·</span>
            Registrado el {formatFecha(bien.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Imagen */}
          <div className="relative h-64 w-full overflow-hidden rounded-lg border bg-muted sm:h-72">
            {bien.imagen_url ? (
              <Image
                src={bien.imagen_url}
                alt={bien.nombre}
                fill
                sizes="(max-width: 640px) 100vw, 640px"
                className="object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <ImageOff className="h-10 w-10" />
                <span className="text-sm">Sin imagen</span>
              </div>
            )}
          </div>

          {/* Estado + valores */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${
                estadoColors[bien.estado] ?? ""
              }`}
            >
              {bien.estado}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {bien.cantidad} {bien.cantidad === 1 ? "unidad" : "unidades"}
            </span>
            <span className="text-sm text-muted-foreground">·</span>
            <span className="text-sm font-semibold">
              {formatCOP(bien.valor_total)}
            </span>
            <span className="text-xs text-muted-foreground">
              ({formatCOP(bien.valor_unitario)} c/u)
            </span>
          </div>

          {/* Campos */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Sede">
              {sede?.nombre_sede ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </Campo>
            <Campo label="Área">
              {area?.nombre_area ?? (
                <span className="text-muted-foreground">—</span>
              )}
            </Campo>
            <Campo label="Responsable">
              {responsable ?? <span className="text-muted-foreground">—</span>}
            </Campo>
            <Campo label="Placa">
              {bien.placa ?? <span className="text-muted-foreground">—</span>}
            </Campo>
            <Campo label="Serial">
              {bien.serial ?? <span className="text-muted-foreground">—</span>}
            </Campo>
          </div>

          {bien.observaciones && (
            <Campo label="Observaciones">
              <p className="whitespace-pre-wrap leading-relaxed">
                {bien.observaciones}
              </p>
            </Campo>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button asChild>
            <Link href={`/bienes/${bien.id_bien}`}>
              <PenLine className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
