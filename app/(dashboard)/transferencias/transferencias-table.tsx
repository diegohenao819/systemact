"use client";

import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SortableHeader } from "@/components/ui/sortable-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type NameRel = { nombre_sede: string };
type ProfileRel = { nombre: string; apellido: string };
type BienRel = { id_bien: number; codigo_generado: string; nombre: string };

interface TransferenciaRow {
  id_transferencia: number;
  motivo: string;
  area_origen: string | null;
  area_destino: string | null;
  created_at: string;
  bienes: BienRel | BienRel[] | null;
  sede_origen_rel: NameRel | NameRel[] | null;
  sede_destino_rel: NameRel | NameRel[] | null;
  responsable_origen_rel: ProfileRel | ProfileRel[] | null;
  responsable_destino_rel: ProfileRel | ProfileRel[] | null;
  usuario_registro_rel: ProfileRel | ProfileRel[] | null;
}

function unwrap<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const columns: ColumnDef<TransferenciaRow>[] = [
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <SortableHeader column={column}>Fecha</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        {formatFecha(row.getValue("created_at"))}
      </span>
    ),
    size: 160,
  },
  {
    id: "bien",
    header: ({ column }) => (
      <SortableHeader column={column}>Bien</SortableHeader>
    ),
    accessorFn: (row) => {
      const bien = unwrap(row.bienes);
      return bien ? `${bien.codigo_generado} ${bien.nombre}` : "";
    },
    cell: ({ row }) => {
      const bien = unwrap(row.original.bienes);
      if (!bien) return <span className="text-muted-foreground">—</span>;
      return (
        <div>
          <span className="font-mono text-xs font-semibold">
            {bien.codigo_generado}
          </span>
          <span className="block text-sm">{bien.nombre}</span>
        </div>
      );
    },
  },
  {
    id: "origen",
    header: "Origen",
    cell: ({ row }) => {
      const sede = unwrap(row.original.sede_origen_rel)?.nombre_sede ?? "—";
      const area = row.original.area_origen;
      const resp = unwrap(row.original.responsable_origen_rel);
      return (
        <div className="text-sm">
          <span className="font-medium">{sede}</span>
          {area && (
            <span className="block text-xs text-muted-foreground">{area}</span>
          )}
          {resp && (
            <span className="block text-xs text-muted-foreground">
              {resp.nombre} {resp.apellido}
            </span>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    id: "flecha",
    header: "",
    cell: () => (
      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
    ),
    size: 30,
    enableSorting: false,
  },
  {
    id: "destino",
    header: "Destino",
    cell: ({ row }) => {
      const sede = unwrap(row.original.sede_destino_rel)?.nombre_sede ?? "—";
      const area = row.original.area_destino;
      const resp = unwrap(row.original.responsable_destino_rel);
      return (
        <div className="text-sm">
          <span className="font-medium">{sede}</span>
          {area && (
            <span className="block text-xs text-muted-foreground">{area}</span>
          )}
          {resp && (
            <span className="block text-xs text-muted-foreground">
              {resp.nombre} {resp.apellido}
            </span>
          )}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "motivo",
    header: ({ column }) => (
      <SortableHeader column={column}>Motivo</SortableHeader>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.getValue("motivo")}</span>
    ),
  },
  {
    id: "usuario",
    header: "Registró",
    cell: ({ row }) => {
      const u = unwrap(row.original.usuario_registro_rel);
      if (!u) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-sm text-muted-foreground">
          {u.nombre} {u.apellido}
        </span>
      );
    },
    enableSorting: false,
    size: 140,
  },
];

interface TransferenciasTableProps {
  data: TransferenciaRow[];
}

export function TransferenciasTable({ data }: TransferenciasTableProps) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "created_at", desc: true },
  ]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: { globalFilter, sorting },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    initialState: {
      pagination: { pageSize: 15 },
    },
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por bien, motivo..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No se han registrado transferencias.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} transferencia(s)
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
